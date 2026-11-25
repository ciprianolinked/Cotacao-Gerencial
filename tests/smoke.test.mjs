import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

async function serverIsUp() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

test("rotas principais e APIs respondem corretamente quando o servidor está ativo", async (t) => {
  if (!(await serverIsUp())) {
    t.skip(`Servidor não está ativo em ${BASE_URL}`);
    return;
  }

  for (const route of [
    "/",
    "/mapas/novo",
    "/condominios",
    "/indicadores",
    "/configuracoes",
    "/ajuda",
    "/ajuda/ia",
  ]) {
    const res = await fetch(`${BASE_URL}${route}`);
    assert.equal(res.status, 200, `Rota ${route} retornou ${res.status}`);
  }

  const health = await (await fetch(`${BASE_URL}/api/health`)).json();
  assert.equal(health.ok, true);
  assert.equal(health.schemaReady, true);

  const ai = await (await fetch(`${BASE_URL}/api/ai/status`)).json();
  assert.equal(ai.provider, "Google Gemini");
  assert.ok(ai.model);
});
