import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { appSettings } from "@/db/schema";
import { DEFAULT_GEMINI_MODEL, getAiConfig, maskApiKey } from "@/lib/server-data";
import { testGeminiConnection } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

async function upsertSetting(key: string, value: string): Promise<void> {
  try {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  } catch {
    // Fallback seguro caso a tabela tenha vindo de uma versão antiga sem constraint única
    await db.delete(appSettings).where(eq(appSettings.key, key));
    await db.insert(appSettings).values({ key, value, updatedAt: new Date() });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      apiKey?: string;
      model?: string;
    };
    const providedKey = body.apiKey?.trim() || "";
    const preferredModel = body.model?.trim() || DEFAULT_GEMINI_MODEL;

    // Garante schema em paralelo enquanto validamos/preparamos
    await ensureSchema();
    const existingCfg = await getAiConfig();
    const effectiveKey = providedKey || existingCfg.apiKey || "";

    if (!effectiveKey) {
      return NextResponse.json(
        { error: "Cole a chave de API do Google Gemini antes de salvar." },
        { status: 400 }
      );
    }

    const testResult = await testGeminiConnection(effectiveKey, preferredModel);

    if (providedKey) {
      await upsertSetting("gemini_api_key", providedKey);
    }
    await upsertSetting("gemini_model", testResult.model);

    return NextResponse.json({
      ok: true,
      configured: true,
      source: providedKey ? "db" : existingCfg.source === "none" ? "db" : existingCfg.source,
      maskedKey: maskApiKey(effectiveKey),
      model: testResult.model,
      message: testResult.message,
    });
  } catch (error) {
    console.error("POST /api/ai/config error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao testar e salvar a chave Gemini.",
      },
      { status: 400 }
    );
  }
}

export async function PUT() {
  try {
    const cfg = await getAiConfig();
    if (!cfg.configured || !cfg.apiKey) {
      return NextResponse.json(
        { error: "Nenhuma chave Gemini cadastrada para testar." },
        { status: 400 }
      );
    }
    const testResult = await testGeminiConnection(cfg.apiKey, cfg.model);
    if (testResult.model !== cfg.model && cfg.source === "db") {
      await upsertSetting("gemini_model", testResult.model).catch(() => {});
    }
    return NextResponse.json({
      ok: true,
      model: testResult.model,
      message: testResult.message,
    });
  } catch (error) {
    console.error("PUT /api/ai/config error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao testar a conexão com o Gemini.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    await ensureSchema();
    await db.delete(appSettings).where(eq(appSettings.key, "gemini_api_key"));
    const cfg = await getAiConfig();
    return NextResponse.json({
      ok: true,
      configured: cfg.configured,
      source: cfg.source,
      maskedKey: cfg.maskedKey,
      model: cfg.model,
    });
  } catch (error) {
    console.error("DELETE /api/ai/config error:", error);
    return NextResponse.json(
      { error: "Erro ao remover chave salva." },
      { status: 500 }
    );
  }
}
