import { NextResponse } from "next/server";
import { db } from "@/db";
import { pdfDownloads } from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;
import { getQuotationById } from "@/lib/server-data";
import { generateQuotationPdf } from "@/lib/pdf-generator";
import { sanitizeSlug } from "@/lib/calculations";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const quotation = await getQuotationById(id);
    if (!quotation) {
      return NextResponse.json({ error: "Mapa não encontrado." }, { status: 404 });
    }

    const pdfBytes = await generateQuotationPdf(quotation);
    const slug = sanitizeSlug(quotation.condominium || "Condominio", 56);
    const fileName = `Mapa-de-Cotacao_${quotation.protocol}_${slug}_${quotation.analysisDate}.pdf`;

    await db.insert(pdfDownloads).values({
      fileName,
      kind: "mapa",
      quotationId: quotation.id,
      condominium: quotation.condominium,
      sizeBytes: pdfBytes.byteLength,
    });

    const base64 = Buffer.from(pdfBytes).toString("base64");
    return NextResponse.json({
      fileName,
      sizeBytes: pdfBytes.byteLength,
      base64,
    });
  } catch (error) {
    console.error("POST /api/quotations/[id]/pdf error:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o PDF do mapa." },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const quotation = await getQuotationById(id);
    if (!quotation) {
      return NextResponse.json({ error: "Mapa não encontrado." }, { status: 404 });
    }

    const pdfBytes = await generateQuotationPdf(quotation);
    const slug = sanitizeSlug(quotation.condominium || "Condominio", 56);
    const fileName = `Mapa-de-Cotacao_${quotation.protocol}_${slug}_${quotation.analysisDate}.pdf`;

    await db.insert(pdfDownloads).values({
      fileName,
      kind: "mapa",
      quotationId: quotation.id,
      condominium: quotation.condominium,
      sizeBytes: pdfBytes.byteLength,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/quotations/[id]/pdf error:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o PDF do mapa." },
      { status: 500 }
    );
  }
}
