import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { appSettings } from "@/db/schema";
import { DEFAULT_GEMINI_MODEL, getAiConfig, maskApiKey } from "@/lib/server-data";
import { testGeminiConnection } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { apiKey?: string; model?: string };
    const apiKey = body.apiKey?.trim();
    const preferredModel = body.model?.trim() || DEFAULT_GEMINI_MODEL;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Cole a chave de API do Google Gemini antes de salvar." },
        { status: 400 }
      );
    }

    const testResult = await testGeminiConnection(apiKey, preferredModel);

    await ensureSchema();

    await db
      .insert(appSettings)
      .values({ key: "gemini_api_key", value: apiKey, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: apiKey, updatedAt: new Date() },
      });

    await db
      .insert(appSettings)
      .values({
        key: "gemini_model",
        value: testResult.model,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: testResult.model, updatedAt: new Date() },
      });

    return NextResponse.json({
      ok: true,
      configured: true,
      source: "db",
      maskedKey: maskApiKey(apiKey),
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
