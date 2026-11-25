import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/server-data";
import { searchProductsWithGemini } from "@/lib/gemini";

export async function POST(request: Request) {
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

    const aiCfg = await getAiConfig();
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
