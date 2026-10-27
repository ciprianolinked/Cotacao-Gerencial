import { db } from "@/db";
import { documentDownloads } from "@/db/schema";

export type DownloadType = "mapa_cotacao" | "indicadores";
export type DownloadFilters = Record<string, string | number | boolean | null>;

export function filenamePart(value: string, fallback = "documento"): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return normalized || fallback;
}

export function quotationPdfFilename(protocol: string, condominium: string, date: string): string {
  return `mapa-${filenamePart(protocol, "cotacao")}-${filenamePart(condominium, "condominio")}-${filenamePart(date, "data")}.pdf`;
}

export function indicatorsPdfFilename(condominium: string, start: string, end: string): string {
  const condo = condominium ? filenamePart(condominium) : "todos-condominios";
  const from = start ? filenamePart(start) : "inicio";
  const to = end ? filenamePart(end) : "hoje";
  return `indicadores-${condo}-${from}-${to}.pdf`;
}

export function safePdfFilename(input: string): string {
  const base = input
    .replace(/\.pdf$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  return `${base || "documento"}.pdf`;
}

export async function registerPdfDownload({
  type,
  fileName,
  quotationId,
  filters = {},
}: {
  type: DownloadType;
  fileName: string;
  quotationId?: string | null;
  filters?: DownloadFilters;
}): Promise<void> {
  await db.insert(documentDownloads).values({
    documentType: type,
    fileName: safePdfFilename(fileName),
    quotationId: quotationId ?? null,
    filters,
  });
}
