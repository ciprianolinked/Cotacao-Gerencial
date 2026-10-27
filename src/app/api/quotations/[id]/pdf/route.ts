import { NextResponse } from "next/server";
import { getQuotation } from "@/lib/server/quotations";
import { generateQuotationPdf } from "@/lib/server/pdf";
import { quotationPdfFilename, registerPdfDownload, safePdfFilename } from "@/lib/server/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const quotation = await getQuotation(id);
    if (!quotation) return NextResponse.json({ error: "Mapa de cotação não encontrado." }, { status: 404 });

    const fileName = safePdfFilename(quotationPdfFilename(quotation.protocol, quotation.condominium, quotation.analysisDate));
    const pdf = await generateQuotationPdf(quotation);
    await registerPdfDownload({ type: "mapa_cotacao", fileName, quotationId: quotation.id });

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(pdf.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar o PDF do mapa de cotação:", error);
    const message = error instanceof Error ? error.message : "Não foi possível gerar o PDF. Tente novamente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
