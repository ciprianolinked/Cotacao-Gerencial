import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/server-data";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const cfg = await getAiConfig();
    return NextResponse.json({
      configured: cfg.configured,
      source: cfg.source,
      maskedKey: cfg.maskedKey,
      model: cfg.model,
      provider: "Google Gemini",
    });
  } catch (error) {
    console.error("GET /api/ai/status error:", error);
    return NextResponse.json(
      { configured: false, source: "none", maskedKey: null, model: "", provider: "Google Gemini" },
      { status: 500 }
    );
  }
}
