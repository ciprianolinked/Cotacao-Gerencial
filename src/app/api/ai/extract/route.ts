import { NextResponse } from "next/server";
import { getAiConfig } from "@/lib/server-data";
import { extractQuotationWithGemini, searchProductsWithGemini } from "@/lib/gemini";
import { parseQuotationText } from "@/lib/calculations";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const uploadedFiles: { name: string; mimeType: string; base64: string; size: number }[] = [];
    let pastedText = "";
    let searchProducts = false;
    let context: {
      condominium?: string;
      analysisDate?: string;
      recipient?: string;
      service?: string;
      description?: string;
      kind?: "servico" | "produtos";
      category?: string;
    } = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      pastedText = String(formData.get("pastedText") || "").trim();
      searchProducts = String(formData.get("searchProducts") || "false") === "true";
      const rawCtx = String(formData.get("context") || "{}");
      try {
        context = JSON.parse(rawCtx);
      } catch {
        context = {};
      }
      const files = formData.getAll("files");
      let totalSize = 0;
      for (const entry of files) {
        if (entry instanceof File && entry.size > 0) {
          totalSize += entry.size;
          if (totalSize > 12 * 1024 * 1024) {
            return NextResponse.json(
              { error: "O tamanho total dos arquivos excede o limite suportado." },
              { status: 400 }
            );
          }
          const arrayBuffer = await entry.arrayBuffer();
          uploadedFiles.push({
            name: entry.name,
            mimeType: entry.type || "application/pdf",
            base64: Buffer.from(arrayBuffer).toString("base64"),
            size: entry.size,
          });
        }
      }
    } else {
      const body = (await request.json()) as {
        pastedText?: string;
        searchProducts?: boolean;
        context?: typeof context;
      };
      pastedText = body.pastedText?.trim() || "";
      searchProducts = Boolean(body.searchProducts);
      context = body.context ?? {};
    }

    if (uploadedFiles.length === 0 && !pastedText) {
      return NextResponse.json(
        {
          error:
            "Envie ao menos um arquivo (PDF ou imagem) ou cole o texto das propostas para análise.",
        },
        { status: 400 }
      );
    }

    const aiCfg = await getAiConfig();

    // If AI is configured, use Gemini
    if (aiCfg.configured && aiCfg.apiKey) {
      const { draft, modelUsed, warnings: extractWarnings } =
        await extractQuotationWithGemini({
          apiKey: aiCfg.apiKey,
          model: aiCfg.model,
          files: uploadedFiles.map((f) => ({
            name: f.name,
            mimeType: f.mimeType,
            base64: f.base64,
          })),
          pastedText,
          context,
          searchProducts,
        });

      const warnings: string[] = [...extractWarnings];

      // Optional trusted-store product link search for product maps
      if (searchProducts && draft.items.length > 0) {
        const queries = draft.items
          .filter((it) => !it.purchaseUrl && it.description.trim().length > 3)
          .slice(0, 5)
          .map((it) => it.description.trim());

        if (queries.length > 0) {
          const searchRes = await searchProductsWithGemini({
            apiKey: aiCfg.apiKey,
            model: modelUsed,
            items: queries,
          });
          warnings.push(...searchRes.warnings);

          for (const res of searchRes.results) {
            const match = draft.items.find(
              (it) =>
                !it.purchaseUrl &&
                it.description.toLowerCase().includes(res.query.toLowerCase().slice(0, 18))
            );
            if (match) {
              match.purchaseUrl = res.url;
              match.purchaseStore = res.store;
              match.purchasePrice = res.price;
              match.purchaseVerified = res.verified;
              match.purchaseSource = "pesquisa";
            }
          }
        }
      }

      return NextResponse.json({
        mode: "ia",
        model: modelUsed,
        draft,
        warnings,
      });
    }

    // Fallback without AI: works for pasted text
    if (pastedText) {
      const draft = parseQuotationText(pastedText, context);
      return NextResponse.json({
        mode: "manual",
        draft,
        warnings: [
          "IA não configurada — leitura realizada pelo analisador de texto local. Revise os campos antes de salvar.",
        ],
      });
    }

    return NextResponse.json(
      {
        error:
          "Para ler arquivos PDF ou imagens automaticamente, configure sua chave gratuita do Google Gemini em Configurar IA — ou cole o texto das propostas.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/ai/extract error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar a leitura das propostas.",
      },
      { status: 500 }
    );
  }
}
