import { NextResponse } from "next/server";
import { DEFAULT_GEMINI_MODEL, getAiConfig, publicAiConfig } from "@/lib/ai-settings";
import { databaseErrorCode } from "@/db/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const config = await getAiConfig({ strict: true });
    return NextResponse.json({ ...publicAiConfig(config), provider: "Google Gemini" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AI status unavailable", { code: databaseErrorCode(error) });
    return NextResponse.json({
      error: "Não foi possível consultar a configuração de IA no banco.",
      code: "AI_SETTINGS_UNAVAILABLE",
      configured: false, source: "none", maskedKey: null,
      model: DEFAULT_GEMINI_MODEL, provider: "Google Gemini",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
