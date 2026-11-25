import { chromium, expect } from "@playwright/test";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const key = "synthetic-browser-test-key-not-a-real-key";
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/identidade/**", (route) => route.fulfill({ status: 404, body: "Missing public image" }));
  await page.goto(`${base}/configuracoes`);
  const logo = page.getByRole("img", { name: "Gerencial — Governança Condominial", exact: true }).first();
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((img) => img.complete && img.naturalWidth === 1271)).toBe(true);
  expect(await logo.getAttribute("src")).toMatch(/^data:image\/png;base64,/);

  let failure = false;
  let remembered = true;
  let failSave = false;
  const calls = [];
  await page.route("**/api/ai/config", async (route) => {
    const req = route.request();
    const body = req.postDataJSON();
    calls.push({ method: req.method(), body });
    if (req.method() === "POST") {
      if (failSave) return route.fulfill({ status: 504, contentType: "text/plain", body: "An error occurred FUNCTION_INVOCATION_TIMEOUT" });
      return route.fulfill({ json: { ok: true, saved: true, tested: false, configured: true, source: "db", maskedKey: "synt••••-key", model: "gemini-4-hydrogen" } });
    }
    if (failure) return route.fulfill({ status: 504, contentType: "text/html", body: "<html>An error occurred FUNCTION_INVOCATION_TIMEOUT</html>" });
    return route.fulfill({ json: { ok: true, model: "gemini-3.5-flash-lite", modelRemembered: remembered, message: "Conexão confirmada com gemini-3.5-flash-lite. Alternância automática." } });
  });

  const field = page.getByLabel("Chave de API do Google Gemini");
  await field.fill(key);
  await page.getByRole("button", { name: "Salvar e testar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Chave salva com sucesso.");
  await expect(page.getByRole("status")).toContainText("gemini-3.5-flash-lite");
  await expect(field).toHaveValue("");
  expect(calls.map((c) => c.method)).toEqual(["POST", "PUT"]);
  expect(calls[1].body.apiKey).toBe(key);
  await expect(page.getByText(/Google Gemini · gemini-3.5-flash-lite/)).toBeVisible();
  console.log("PASS: salvamento confirmado antes do teste e modelo atualizado na tela");

  failure = true;
  await field.fill(key);
  await page.getByRole("button", { name: "Salvar e testar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("A chave foi salva, mas o teste");
  await expect(page.getByRole("status")).not.toContainText("Unexpected token");
  await expect(page.getByText("Configuração salva", { exact: true })).toBeVisible();
  await expect(field).toHaveValue("");
  console.log("PASS: timeout textual da Vercel no teste não é exibido como falha de salvamento");

  failure = false;
  remembered = false;
  const newKey = "different-synthetic-draft-key-not-real";
  await field.fill(newKey);
  const count = calls.length;
  await page.getByRole("button", { name: "Testar conexão", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("ainda não foi salva");
  expect(calls.length).toBe(count + 1);
  expect(calls.at(-1).method).toBe("PUT");
  expect(calls.at(-1).body.apiKey).toBe(newKey);
  await expect(field).toHaveValue(newKey);
  console.log("PASS: testar usa a chave do campo sem gravá-la ou apagá-la");

  failSave = true;
  await page.getByRole("button", { name: "Salvar e testar", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Não foi possível confirmar o salvamento");
  await expect(page.getByRole("main").getByRole("alert")).not.toContainText("Unexpected token");
  await expect(field).toHaveValue(newKey);
  console.log("PASS: falha real ao salvar mantém o texto e mostra mensagem legível");

  await page.screenshot({ path: "/tmp/gerencial-config-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(logo).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/gerencial-config-mobile.png", fullPage: true });
  expect(pageErrors).toEqual([]);
  const image = await page.request.get(`${base}/api/brand/logo`);
  expect(image.status()).toBe(200);
  expect((await image.body()).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  console.log("PASS: logo original no desktop/mobile sem depender de public/; nenhuma exceção no navegador");
} finally { await browser.close(); }
