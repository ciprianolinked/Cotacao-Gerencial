import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { tsImport } from "tsx/esm/api";
import { PDFDocument } from "pdf-lib";

const transport = await tsImport("../src/lib/gemini-transport.ts", import.meta.url);
const http = await tsImport("../src/lib/http-client.ts", import.meta.url);
const brand = await tsImport("../src/lib/brand-assets.ts", import.meta.url);
const KEY = "synthetic-test-key-not-a-real-google-key";
const okResponse = () => Response.json({ candidates: [{ content: { parts: [{ text: "OK" }] } }] });

async function withFetch(mock, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try { await fn(); } finally { globalThis.fetch = original; }
}

test("503 no primário alterna imediatamente e usa a chave no header", async () => {
  const calls = [];
  await withFetch(async (url, init) => {
    calls.push(String(url));
    assert.equal(init.headers["x-goog-api-key"], KEY);
    assert.ok(!String(url).includes(KEY));
    return calls.length === 1 ? new Response("An error occurred", { status: 503 }) : okResponse();
  }, async () => {
    const result = await transport.testGeminiConnection(KEY, "gemini-4-hydrogen");
    assert.equal(result.model, "gemini-3.5-flash-lite");
    assert.equal(result.attempts.length, 2);
    assert.equal(calls.length, 2);
  });
});

test("modelo que já funcionou é tentado primeiro", async () => {
  let firstUrl;
  await withFetch(async (url) => { firstUrl = String(url); return okResponse(); }, async () => {
    const result = await transport.testGeminiConnection(KEY, "gemini-3.5-flash-lite");
    assert.ok(firstUrl.includes("gemini-3.5-flash-lite"));
    assert.equal(result.attempts.length, 1);
  });
});

test("timeout individual avança sem ultrapassar o prazo total", async () => {
  let count = 0;
  await withFetch(async (_url, init) => {
    count++;
    if (count > 1) return okResponse();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(okResponse()), 1000);
      init.signal.addEventListener("abort", () => { clearTimeout(timer); reject(init.signal.reason); }, { once: true });
    });
  }, async () => {
    const started = Date.now();
    const result = await transport.testGeminiConnection(KEY, "gemini-4-hydrogen", { attemptTimeoutMs: 20, totalTimeoutMs: 150 });
    assert.equal(result.model, "gemini-3.5-flash-lite");
    assert.equal(result.attempts[0].detail, "timeout");
    assert.ok(Date.now() - started < 500);
  });
});

test("todos os modelos lentos respeitam um único prazo", async () => {
  await withFetch(async (_url, init) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(okResponse()), 1000);
    init.signal.addEventListener("abort", () => { clearTimeout(timer); reject(init.signal.reason); }, { once: true });
  }), async () => {
    const started = Date.now();
    await assert.rejects(transport.testGeminiConnection(KEY, "gemini-4-hydrogen", { attemptTimeoutMs: 20, totalTimeoutMs: 45 }), (error) => {
      assert.equal(error.code, "GEMINI_TIMEOUT");
      assert.equal(error.status, 504);
      assert.ok(!error.message.includes(KEY));
      return true;
    });
    assert.ok(Date.now() - started < 500);
  });
});

test("chave recusada não é mascarada como erro 503 e não percorre todos modelos", async () => {
  let calls = 0;
  await withFetch(async () => { calls++; return Response.json({ error: { message: "API key not valid", details: [{ reason: "API_KEY_INVALID" }] } }, { status: 400 }); }, async () => {
    await assert.rejects(transport.testGeminiConnection(KEY, "gemini-4-hydrogen"), (error) => {
      assert.equal(error.code, "GEMINI_INVALID_KEY");
      return true;
    });
    assert.equal(calls, 1);
  });
});

test("404 de modelo e JSON 200 inválido permitem alternância", async () => {
  let calls = 0;
  await withFetch(async () => {
    calls++;
    if (calls === 1) return Response.json({ error: { message: "Model invalid or not found" } }, { status: 404 });
    if (calls === 2) return new Response("<html>Invalid gateway response</html>", { status: 200 });
    return okResponse();
  }, async () => {
    const result = await transport.testGeminiConnection(KEY, "gemini-4-hydrogen");
    assert.equal(result.model, "gemini-3.8-flash");
    assert.equal(calls, 3);
  });
});

test("cliente converte resposta textual/HTML da Vercel sem SyntaxError", async () => {
  for (const [status, body] of [[504, "An error occurred FUNCTION_INVOCATION_TIMEOUT"], [502, "<html>Bad Gateway</html>"], [200, "not a JSON response"]]) {
    await assert.rejects(http.readApiResponse(new Response(body, { status })), (error) => {
      assert.ok(error instanceof http.ApiRequestError);
      assert.ok(!/Unexpected token|not valid JSON|<html>/i.test(error.message));
      assert.equal(error.status, status);
      return true;
    });
  }
  const parsed = await http.readApiResponse(Response.json({ ok: true, saved: true }));
  assert.equal(parsed.saved, true);
});

test("logo original está incorporada e pode ser usada em PDF sem public/", async () => {
  const bytes = Buffer.from(brand.GERENCIAL_LOGO_DATA_URI.split(",")[1], "base64");
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), brand.GERENCIAL_LOGO_SHA256);
  const doc = await PDFDocument.create();
  const embedded = await doc.embedPng(brand.GERENCIAL_LOGO_DATA_URI);
  assert.equal(embedded.width, 1271);
  assert.equal(embedded.height, 231);
});

test("salvar/testar em PostgreSQL: atomicidade, modelo lembrado e chave correta", { skip: process.env.RUN_DB_TESTS !== "1" }, async (t) => {
  await import("dotenv/config");
  const { db, getPool } = await tsImport("../src/db/index.ts", import.meta.url);
  const { appSettings } = await tsImport("../src/db/schema.ts", import.meta.url);
  const { ensureSettingsSchema } = await tsImport("../src/db/settings.ts", import.meta.url);
  const { getAiConfig } = await tsImport("../src/lib/ai-settings.ts", import.meta.url);
  const route = await tsImport("../src/app/api/ai/config/route.ts", import.meta.url);
  const { inArray, sql } = await import("drizzle-orm");
  await ensureSettingsSchema();
  const keys = ["gemini_api_key", "gemini_model"];
  const backup = await db.select().from(appSettings).where(inArray(appSettings.key, keys));
  const request = (method, data) => new Request("http://localhost/api/ai/config", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

  try {
    await t.test("POST salva sem nenhuma chamada ao Gemini", async () => {
      await withFetch(async () => { throw new Error("Save must never call Google"); }, async () => {
        const response = await route.POST(request("POST", { apiKey: KEY, model: "gemini-4-hydrogen" }));
        assert.equal(response.status, 200);
        const json = await response.json();
        assert.equal(json.saved, true);
        assert.equal(json.tested, false);
        assert.ok(!JSON.stringify(json).includes(KEY));
      });
      const config = await getAiConfig({ strict: true });
      assert.equal(config.apiKey, KEY);
    });
    await t.test("PUT lembra o modelo vencedor e novo salvamento não o redefine", async () => {
      let calls = 0;
      await withFetch(async () => ++calls === 1 ? new Response("An error occurred", { status: 503 }) : okResponse(), async () => {
        const result = await (await route.PUT(request("PUT", {}))).json();
        assert.equal(result.model, "gemini-3.5-flash-lite");
        assert.equal(result.modelRemembered, true);
      });
      const res = await route.POST(request("POST", { apiKey: KEY }));
      assert.equal((await res.json()).model, "gemini-3.5-flash-lite");
      assert.equal((await getAiConfig({ strict: true })).model, "gemini-3.5-flash-lite");
    });
    await t.test("testar chave do campo não testa/substitui a chave já salva", async () => {
      const other = "other-synthetic-test-key-not-real-either";
      await withFetch(async (_url, init) => { assert.equal(init.headers["x-goog-api-key"], other); return okResponse(); }, async () => {
        const response = await route.PUT(request("PUT", { apiKey: other, model: "gemini-3.5-flash-lite" }));
        const json = await response.json();
        assert.equal(response.status, 200);
        assert.equal(json.testedSource, "input");
        assert.equal(json.modelRemembered, false);
        assert.equal((await getAiConfig({ strict: true })).apiKey, KEY);
      });
    });
    await t.test("falha de teste mantém a chave salva e retorna JSON seguro", async () => {
      await withFetch(async () => new Response("An error occurred", { status: 503 }), async () => {
        const response = await route.PUT(request("PUT", {}));
        assert.equal(response.status, 503);
        const json = await response.json();
        assert.equal(json.stage, "test");
        assert.ok(!JSON.stringify(json).includes(KEY));
      });
      assert.equal((await getAiConfig({ strict: true })).apiKey, KEY);
    });
    await t.test("erro de gravação é JSON, não expõe chave e preserva configuração", async () => {
      let signalAcquired, release;
      const acquired = new Promise((resolve) => { signalAcquired = resolve; });
      const hold = new Promise((resolve) => { release = resolve; });
      const blocker = db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(73421902)`);
        signalAcquired();
        await hold;
      });
      await acquired;
      try {
        const response = await route.POST(request("POST", { apiKey: "another-synthetic-test-key-not-real" }));
        assert.equal(response.status, 503);
        const json = await response.json();
        assert.equal(json.saved, false);
        assert.equal(json.stage, "save");
        assert.ok(!JSON.stringify(json).includes(KEY));
        assert.ok(!JSON.stringify(json).includes("another-synthetic"));
      } finally { release(); await blocker; }
      assert.equal((await getAiConfig({ strict: true })).apiKey, KEY);
    });
    await t.test("entrada JSON inválida e chave mascarada não alteram dados", async () => {
      const invalid = await route.POST(new Request("http://localhost/api/ai/config", { method: "POST", body: "broken-json" }));
      assert.equal(invalid.status, 400);
      const masked = await route.POST(request("POST", { apiKey: "AQ.A••••aGfA" }));
      assert.equal(masked.status, 400);
      assert.equal((await getAiConfig({ strict: true })).apiKey, KEY);
    });
  } finally {
    await db.transaction(async (tx) => {
      await tx.delete(appSettings).where(inArray(appSettings.key, keys));
      if (backup.length) await tx.insert(appSettings).values(backup);
    });
    await getPool().end();
  }
});
