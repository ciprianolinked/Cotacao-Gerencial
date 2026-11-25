import { NextResponse } from "next/server";
import { db } from "@/db";
import { pdfDownloads } from "@/db/schema";
import { listQuotations } from "@/lib/server-data";
import { generateIndicatorsPdf } from "@/lib/pdf-generator";
import { sanitizeSlug, todayISO } from "@/lib/calculations";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      condominium?: string;
      startDate?: string;
      endDate?: string;
    };

    const all = await listQuotations();
    const condo = body.condominium?.trim() || "";
    const startDate = body.startDate?.trim() || "";
    const endDate = body.endDate?.trim() || "";

    const filtered = all.filter((q) => {
      if (condo && q.condominium !== condo) return false;
      if (startDate && q.analysisDate < startDate) return false;
      if (endDate && q.analysisDate > endDate) return false;
      return true;
    });

    const pdfBytes = await generateIndicatorsPdf({
      quotations: filtered,
      condominiumFilter: condo,
      startDate,
      endDate,
    });

    const slug = condo ? sanitizeSlug(condo, 40) : "Todos-os-Condominios";
    const fileName = `Indicadores-Assembleia_${slug}_${todayISO()}.pdf`;

    await db.insert(pdfDownloads).values({
      fileName,
      kind: "indicadores",
      quotationId: null,
      condominium: condo || "Todos os condomínios",
      sizeBytes: pdfBytes.byteLength,
    });

    return NextResponse.json({
      fileName,
      sizeBytes: pdfBytes.byteLength,
      base64: Buffer.from(pdfBytes).toString("base64"),
    });
  } catch (error) {
    console.error("POST /api/indicators/pdf error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar PDF de indicadores." },
      { status: 500 }
    );
  }
}
