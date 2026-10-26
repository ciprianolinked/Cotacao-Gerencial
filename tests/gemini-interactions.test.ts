import "dotenv/config";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createGeminiInteraction, resolveGeminiModel } from "../src/lib/server/gemini";

test("seleciona o modelo atual e corrige a configuração antiga", () => {
  assert.equal(resolveGeminiModel(), "gemini-3.8-flash");
  assert.equal(resolveGeminiModel("gemini-2.5-flash"), "gemini-3.8-flash");
  assert.equal(resolveGeminiModel(" models/gemini-2.5-flash "), "gemini-3.8-flash");
  assert.equal(resolveGeminiModel("models/gemini-3.8-flash"), "gemini-3.8-flash");
  assert.equal(resolveGeminiModel("gemini-modelo-personalizado"), "gemini-modelo-personalizado");
});

test("envia texto, PDF e imagem à API Interactions com resposta estruturada", async () => {
  const originalFetch = globalThis.fetch;
  const schema = { type: "object", properties: { suppliers: { type: "array" } } };
  let called = false;
  const mockFetch: typeof fetch = async (url, init) => {
    called = true;
    assert.equal(String(url), "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "chave-de-teste");
    assert.ok(!String(url).includes("chave-de-teste"));
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    assert.equal(body.model, "gemini-3.8-flash");
    assert.equal(body.store, false);
    assert.deepEqual(body.generation_config, { thinking_level: "low" });
    assert.deepEqual(body.response_format, { type: "text", mime_type: "application/json", schema });
    assert.deepEqual(body.input, [
      { type: "text", text: "Analisar propostas" },
      { type: "document", mime_type: "application/pdf", data: "cGRm" },
      { type: "image", mime_type: "image/jpeg", data: "anBn" },
    ]);
    return Response.json({
      status: "completed",
      steps: [
        { type: "thought", summary: [{ type: "text", text: "não deve ser usado" }] },
        { type: "model_output", content: [{ type: "text", text: '{"suppliers":[]}' }] },
      ],
    });
  };
  globalThis.fetch = mockFetch;
  try {
    const result = await createGeminiInteraction({
      model: "gemini-2.5-flash",
      apiKey: "chave-de-teste",
      input: [
        { type: "text", text: "Analisar propostas" },
        { type: "document", mime_type: "application/pdf", data: "cGRm" },
        { type: "image", mime_type: "image/jpeg", data: "anBn" },
      ],
      responseSchema: schema,
    });
    assert.equal(result, '{"suppliers":[]}');
    assert.equal(called, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("mostra orientação amigável quando o modelo não está disponível", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("detalhes privados", { status: 404 });
  try {
    await assert.rejects(
      createGeminiInteraction({
        model: "gemini-3.8-flash",
        apiKey: "chave-de-teste",
        input: [{ type: "text", text: "Teste" }],
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /modelo Gemini configurado não está disponível/i);
        assert.match(error.message, /gemini-3\.8-flash/);
        assert.doesNotMatch(error.message, /detalhes privados|chave-de-teste/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("não considera uma resposta incompleta como teste bem-sucedido", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ status: "incomplete", steps: [] });
  try {
    await assert.rejects(
      createGeminiInteraction({
        model: "gemini-3.8-flash",
        apiKey: "chave-de-teste",
        input: [{ type: "text", text: "Teste" }],
      }),
      /não concluiu a análise/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("o teste de chave e a extração usam o mesmo modelo e a mesma API", async () => {
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_MODEL;
  process.env.GEMINI_API_KEY = "chave-ficticia-para-teste";
  process.env.GEMINI_MODEL = "models/gemini-2.5-flash";
  const requests: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://generativelanguage.googleapis.com/v1beta/interactions");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requests.push(body);
    const answer = body.response_format
      ? JSON.stringify({
          condominium: "Condomínio de teste",
          kind: "produtos",
          category: "Hidráulica",
          suppliers: [{ name: "Fornecedor de teste" }],
          items: [{ description: "Tubo", quantity: 2, unit: "un", prices: [12.5] }],
        })
      : "OK";
    return Response.json({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: answer }] }] });
  };

  try {
    const { testGeminiKey, extractQuotation } = await import("../src/lib/ai");
    const check = await testGeminiKey("chave-ficticia-para-teste");
    assert.deepEqual(check, { ok: true, model: "gemini-3.8-flash" });
    const result = await extractQuotation({
      files: [
        { name: "proposta.pdf", type: "application/pdf", size: 3, base64: "cGRm" },
        { name: "foto.jpg", type: "image/jpeg", size: 3, base64: "anBn" },
      ],
      text: "",
      hints: {},
    });
    assert.equal(result.mode, "ia");
    assert.match(result.provider, /gemini-3\.8-flash/);
    assert.equal(result.draft.suppliers[0].name, "Fornecedor de teste");
    assert.equal(result.draft.items[0].prices[result.draft.suppliers[0].id], 12.5);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].model, "gemini-3.8-flash");
    assert.equal(requests[1].model, "gemini-3.8-flash");
    assert.ok(Array.isArray(requests[1].input));
    const input = requests[1].input as Array<{ type: string; mime_type?: string }>;
    assert.ok(input.some((part) => part.type === "document" && part.mime_type === "application/pdf"));
    assert.ok(input.some((part) => part.type === "image" && part.mime_type === "image/jpeg"));
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousModel;
  }
});

after(async () => {
  const { pool } = await import("../src/db");
  await pool.end();
});
