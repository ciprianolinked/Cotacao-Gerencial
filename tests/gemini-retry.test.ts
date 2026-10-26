import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createGeminiInteractionDetailed,
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  type GeminiInputPart,
} from "../src/lib/server/gemini";

const documents: GeminiInputPart[] = [
  { type: "text", text: "Compare as três propostas" },
  { type: "document", mime_type: "application/pdf", data: "cGRmMQ==" },
  { type: "document", mime_type: "application/pdf", data: "cGRmMg==" },
  { type: "document", mime_type: "application/pdf", data: "cGRmMw==" },
];
const schema = { type: "object", properties: { suppliers: { type: "array" } } };
const interactionOk = () => Response.json({
  status: "completed",
  steps: [{ type: "model_output", content: [{ type: "text", text: '{"suppliers":[]}' }] }],
});
const generationOk = () => Response.json({
  candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"suppliers":[]}' }] } }],
});

function request(onRetry?: (phase: "retrying" | "alternative") => void) {
  return {
    model: DEFAULT_GEMINI_MODEL,
    apiKey: "chave-ficticia",
    input: documents,
    responseSchema: schema,
    retryBaseDelayMs: 0,
    onRetry,
  };
}

test("repete uma falha 503 e mantém os três PDFs e a chave protegida", async () => {
  const original = globalThis.fetch;
  const phases: string[] = [];
  const requests: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.doesNotMatch(String(url), /chave-ficticia/);
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "chave-ficticia");
    requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return requests.length === 1 ? new Response("temporarily unavailable", { status: 503 }) : interactionOk();
  };
  try {
    const result = await createGeminiInteractionDetailed(request((phase) => phases.push(phase)));
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0].input, documents);
    assert.deepEqual(requests[1].input, documents);
    assert.deepEqual(phases, ["retrying"]);
    assert.equal(result.model, DEFAULT_GEMINI_MODEL);
    assert.equal(result.usedAlternative, true);
    assert.equal(result.switchedModel, false);
  } finally {
    globalThis.fetch = original;
  }
});

test("usa GenerateContent se Interactions continuar retornando erro 500", async () => {
  const original = globalThis.fetch;
  const phases: string[] = [];
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls += 1;
    if (calls <= 2) {
      assert.match(String(url), /\/interactions$/);
      return new Response("erro interno", { status: 500 });
    }
    assert.match(String(url), /models\/gemini-3\.8-flash:generateContent$/);
    const body = JSON.parse(String(init?.body)) as {
      contents: Array<{ parts: Array<Record<string, unknown>> }>;
      generationConfig: { responseFormat: unknown; thinkingConfig: unknown };
    };
    assert.equal(body.contents[0].parts.length, 4);
    assert.deepEqual(body.contents[0].parts[1], { inlineData: { mimeType: "application/pdf", data: "cGRmMQ==" } });
    assert.deepEqual(body.generationConfig.responseFormat, { text: { mimeType: "APPLICATION_JSON", schema } });
    assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingLevel: "low" });
    return generationOk();
  };
  try {
    const result = await createGeminiInteractionDetailed(request((phase) => phases.push(phase)));
    assert.equal(calls, 3);
    assert.equal(result.model, DEFAULT_GEMINI_MODEL);
    assert.equal(result.switchedModel, false);
    assert.deepEqual(phases, ["retrying", "alternative"]);
    assert.equal(result.text, '{"suppliers":[]}');
  } finally {
    globalThis.fetch = original;
  }
});

test("usa o modelo alternativo quando o principal segue indisponível", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  const phases: string[] = [];
  globalThis.fetch = async (url, init) => {
    urls.push(String(url));
    if (urls.length < 4) return new Response("temporariamente indisponível", { status: 503 });
    const body = JSON.parse(String(init?.body)) as { contents: Array<{ parts: unknown[] }> };
    assert.equal(body.contents[0].parts.length, 4);
    return generationOk();
  };
  try {
    const result = await createGeminiInteractionDetailed(request((phase) => phases.push(phase)));
    assert.equal(urls.length, 4);
    assert.match(urls[3], /gemini-3\.1-flash-lite:generateContent$/);
    assert.equal(result.model, FALLBACK_GEMINI_MODEL);
    assert.equal(result.switchedModel, true);
    assert.deepEqual(phases, ["retrying", "alternative", "alternative"]);
  } finally {
    globalThis.fetch = original;
  }
});

test("não repete chave inválida nem revela informações da resposta", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('{"error":{"message":"API key not valid. secret"}}', { status: 400 });
  };
  try {
    await assert.rejects(createGeminiInteractionDetailed(request()), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /chave do Gemini não é válida/i);
      assert.doesNotMatch(error.message, /secret|chave-ficticia/);
      return true;
    });
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("repete uma limitação temporária apenas uma vez", async () => {
  const original = globalThis.fetch;
  const phases: string[] = [];
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? Response.json({ error: { code: "rate_limit_exceeded" } }, { status: 429 })
      : interactionOk();
  };
  try {
    const result = await createGeminiInteractionDetailed(request((phase) => phases.push(phase)));
    assert.equal(calls, 2);
    assert.equal(result.model, DEFAULT_GEMINI_MODEL);
    assert.deepEqual(phases, ["retrying"]);
  } finally {
    globalThis.fetch = original;
  }
});

test("trata falha transitória informada no corpo da interação", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? Response.json({ status: "failed", error: { code: "service_unavailable" } })
      : interactionOk();
  };
  try {
    const result = await createGeminiInteractionDetailed(request());
    assert.equal(calls, 2);
    assert.equal(result.text, '{"suppliers":[]}');
  } finally {
    globalThis.fetch = original;
  }
});

test("não repete solicitações quando a cota diária foi esgotada", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ error: { code: "quota_exceeded" } }, { status: 429 });
  };
  try {
    await assert.rejects(createGeminiInteractionDetailed(request()), /limite de uso ou falta de cota/i);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("identifica limite diário no formato antigo do Google", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ error: { status: "RESOURCE_EXHAUSTED", message: "GenerateRequestsPerDay exceeded" } }, { status: 429 });
  };
  try {
    await assert.rejects(createGeminiInteractionDetailed(request()), /limite de uso ou falta de cota/i);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("respeita um Retry-After longo sem tentar imediatamente", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("serviço indisponível", { status: 503, headers: { "retry-after": "30" } });
  };
  try {
    await assert.rejects(createGeminiInteractionDetailed(request()), /código 503/i);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("o cancelamento durante a espera impede novas chamadas", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("instável", { status: 503 });
  };
  try {
    await assert.rejects(createGeminiInteractionDetailed({
      ...request(() => controller.abort()),
      signal: controller.signal,
    }), /análise cancelada/i);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("erro 503 persistente mantém os arquivos e informa o código", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("detalhes privados", { status: 503 });
  };
  try {
    await assert.rejects(createGeminiInteractionDetailed(request()), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /código 503/i);
      assert.match(error.message, /arquivos continuam selecionados/i);
      assert.doesNotMatch(error.message, /detalhes privados|chave-ficticia/i);
      return true;
    });
    assert.equal(calls, 4);
  } finally {
    globalThis.fetch = original;
  }
});
