import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/ai";
import { getGeminiKey, maskKey } from "@/lib/server/quotations";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getAiConfig();
  const { key } = await getGeminiKey();
  return NextResponse.json({
    connected: config.provider !== "none",
    provider: config.provider,
    model: config.model,
    source: config.source,
    free: config.free,
    maskedKey: key && config.provider === "gemini" ? maskKey(key) : null,
    label:
      config.provider === "none"
        ? "IA não ativada — configure grátis"
        : config.provider === "gemini"
          ? `Gemini gratuito · ${config.source === "painel" ? "chave do painel" : "chave do ambiente"}`
          : `OpenAI · ${config.model}`,
    setupUrl: "/configuracoes",
    guideUrl: "/ajuda/ia",
    accepts: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  });
}
