import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pdfExports } from "@/db/schema";

export type PdfExportRecord = {
  id: string;
  fileName: string;
  kind: string;
  protocol: string | null;
  condominium: string | null;
  sizeBytes: number;
  createdAt: string;
};

/** Registra o nome do arquivo entregue ao usuário a cada download. */
export async function recordPdfExport(input: {
  fileName: string;
  kind: "mapa" | "indicadores";
  sizeBytes: number;
  referenceId?: string | null;
  protocol?: string | null;
  condominium?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}): Promise<PdfExportRecord> {
  const [row] = await db.insert(pdfExports).values({
    fileName: input.fileName.slice(0, 200),
    kind: input.kind,
    sizeBytes: Math.max(0, Math.round(input.sizeBytes)),
    referenceId: input.referenceId ?? null,
    protocol: input.protocol ?? null,
    condominium: input.condominium ?? null,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
  }).returning();
  return toRecord(row);
}

export async function listPdfExports(limit = 10): Promise<PdfExportRecord[]> {
  const rows = await db.select().from(pdfExports).orderBy(desc(pdfExports.createdAt)).limit(limit);
  return rows.map(toRecord);
}

export async function listPdfExportsForQuotation(quotationId: string): Promise<PdfExportRecord[]> {
  const rows = await db.select().from(pdfExports)
    .where(eq(pdfExports.referenceId, quotationId))
    .orderBy(desc(pdfExports.createdAt))
    .limit(10);
  return rows.map(toRecord);
}

function toRecord(row: typeof pdfExports.$inferSelect): PdfExportRecord {
  return {
    id: row.id,
    fileName: row.fileName,
    kind: row.kind,
    protocol: row.protocol,
    condominium: row.condominium,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  };
}
