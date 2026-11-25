import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/ai-settings";
import { searchProductsWithGemini } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const deadlineMs = Date.now() + 48_000;
  try {
    const body = (await request.json()) as {
      items?: string[];
      condominium?: string;
    };

    const items = (body.items ?? [])
      .map((s) => String(s).trim())
      .filter((s) => s.length > 2)
      .slice(0, 8);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Informe ao menos um produto para pesquisar." },
        { status: 400 }
      );
    }

    const aiCfg = await getAiConfig({ strict: true });
    if (!aiCfg.configured || !aiCfg.apiKey) {
      return NextResponse.json(
        {
          error:
            "Configure sua chave gratuita do Google Gemini em Configurar IA para pesquisar produtos online em lojas confiáveis.",
        },
        { status: 400 }
      );
    }

    const { results, warnings } = await searchProductsWithGemini({
      apiKey: aiCfg.apiKey,
      model: aiCfg.model,
      items,
      callOptions: { deadlineMs },
    });

    return NextResponse.json({ results, warnings });
  } catch (error) {
    console.error("POST /api/ai/product-search error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao pesquisar produtos online.",
      },
      { status: 500 }
    );
  }
}
