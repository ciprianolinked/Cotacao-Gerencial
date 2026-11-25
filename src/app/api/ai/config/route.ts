import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { databaseErrorCode } from "@/db/settings";
import {
  DEFAULT_GEMINI_MODEL,
  getAiConfig,
  publicAiConfig,
  rememberWorkingModel,
  removeAiConfig,
  saveAiConfig,
  validGeminiModel,
} from "@/lib/ai-settings";
import { GeminiError, testGeminiConnection } from "@/lib/gemini-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const responseHeaders = { "Cache-Control": "no-store, max-age=0" };

class InputError extends Error {}

type ConfigInput = { apiKey?: string; model?: string };

async function readInput(request: Request): Promise<ConfigInput> {
  const text = await request.text();
  if (!text.trim()) return {};
  if (text.length > 8_192) throw new InputError("O conteúdo enviado é muito grande para uma chave de API.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new InputError("Solicitação inválida. Recarregue a página e tente novamente."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Solicitação inválida.");
  const body = value as Record<string, unknown>;
  if (body.apiKey !== undefined && typeof body.apiKey !== "string") throw new InputError("Informe a chave como texto.");
  if (body.model !== undefined && !validGeminiModel(body.model)) throw new InputError("O identificador do modelo Gemini é inválido.");
  return { apiKey: typeof body.apiKey === "string" ? body.apiKey.trim() : undefined, model: body.model as string | undefined };
}

function validateKey(value: string | undefined): string {
  if (!value) throw new InputError("Cole a chave do Google Gemini antes de salvar ou testar.");
  if (value.length < 20 || value.length > 512 || /\s|[^\x21-\x7e]/.test(value)) {
    throw new InputError("A chave parece incompleta ou contém espaços/caracteres inválidos. Copie a chave inteira, sem a máscara de segurança.");
  }
  return value;
}

function failure(error: unknown, stage: "save" | "test" | "read" | "remove", requestId: string) {
  if (error instanceof InputError) {
    return NextResponse.json({ ok: false, error: error.message, code: "INVALID_INPUT", stage, saved: false, requestId }, { status: 400, headers: responseHeaders });
  }
  if (error instanceof GeminiError) {
    return NextResponse.json({ ok: false, error: error.message, code: error.code, stage, attempts: error.attempts, requestId }, { status: error.status, headers: responseHeaders });
  }
  const code = databaseErrorCode(error);
  // A Drizzle error can include the API key as a bound SQL parameter. Never log it.
  console.error("AI configuration storage failure", { requestId, stage, code });
  const message = code === "42501"
    ? "O banco recusou a gravação por falta de permissão. Verifique o acesso de escrita à tabela app_settings."
    : stage === "save"
      ? "Não foi possível salvar a chave no banco de dados. A configuração anterior foi preservada; verifique a conexão PostgreSQL e tente novamente."
      : stage === "test"
        ? "Não foi possível carregar a chave salva. Verifique a conexão com o banco ou informe a chave no campo para testá-la sem salvar."
        : "Não foi possível acessar as configurações no banco de dados. Tente novamente.";
  return NextResponse.json({ ok: false, error: message, code: "AI_SETTINGS_UNAVAILABLE", stage, saved: false, requestId }, { status: 503, headers: responseHeaders });
}

export async function GET() {
  const requestId = randomUUID();
  try {
    const config = await getAiConfig({ strict: true });
    return NextResponse.json({ ok: true, ...publicAiConfig(config), requestId }, { headers: responseHeaders });
  } catch (error) { return failure(error, "read", requestId); }
}

/** Persist first and respond. Testing is a separate PUT with its own deadline. */
export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    const input = await readInput(request);
    const key = validateKey(input.apiKey);
    const config = await saveAiConfig(key, input.model);
    return NextResponse.json({
      ok: true, saved: true, tested: false, ...config, requestId,
      message: "Chave salva no banco com sucesso. O teste da conexão é uma etapa separada.",
    }, { headers: responseHeaders });
  } catch (error) { return failure(error, "save", requestId); }
}

export async function PUT(request: Request) {
  const requestId = randomUUID();
  const deadlineMs = Date.now() + 44_000;
  try {
    const input = await readInput(request);
    // A pasted key must be tested as entered, never silently replaced by a saved one.
    const suppliedKey = input.apiKey ? validateKey(input.apiKey) : null;
    const stored = suppliedKey ? null : await getAiConfig({ strict: true });
    const key = suppliedKey || stored?.apiKey;
    if (!key) throw new InputError("Nenhuma chave cadastrada. Cole a chave no campo para testar.");
    const model = input.model || stored?.model || DEFAULT_GEMINI_MODEL;
    const result = await testGeminiConnection(key, model, { deadlineMs });

    let modelRemembered = false;
    let warning: string | undefined;
    try {
      modelRemembered = await rememberWorkingModel(key, result.model);
    } catch (error) {
      console.warn("AI test passed; model not persisted", { requestId, code: databaseErrorCode(error) });
      warning = "O teste funcionou, mas não foi possível memorizar o modelo no banco. A chave não foi alterada.";
    }
    return NextResponse.json({
      ok: true, tested: true, model: result.model, modelRemembered,
      testedSource: suppliedKey ? "input" : stored?.source,
      message: result.message, attempts: result.attempts, warning, requestId,
    }, { headers: responseHeaders });
  } catch (error) { return failure(error, "test", requestId); }
}

export async function DELETE() {
  const requestId = randomUUID();
  try {
    const config = await removeAiConfig();
    return NextResponse.json({ ok: true, ...config, requestId }, { headers: responseHeaders });
  } catch (error) { return failure(error, "remove", requestId); }
}
