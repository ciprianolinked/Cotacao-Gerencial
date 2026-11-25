import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appSettings,
  condominiums,
  pdfDownloads,
  quotations,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import type {
  CondominiumRecord,
  PdfDownloadRecord,
  QuotationRecord,
} from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";

export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export async function getAiConfig(): Promise<{
  configured: boolean;
  source: "env" | "db" | "none";
  apiKey: string | null;
  maskedKey: string | null;
  model: string;
}> {
  const envKey = process.env.GEMINI_API_KEY?.trim();
  const modelRow = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "gemini_model"))
    .limit(1);
  const model =
    modelRow[0]?.value?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL;

  const dbKeyRow = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "gemini_api_key"))
    .limit(1);
  const dbKey = dbKeyRow[0]?.value?.trim();

  if (dbKey) {
    return {
      configured: true,
      source: "db",
      apiKey: dbKey,
      maskedKey: maskApiKey(dbKey),
      model,
    };
  }
  if (envKey) {
    return {
      configured: true,
      source: "env",
      apiKey: envKey,
      maskedKey: maskApiKey(envKey),
      model,
    };
  }
  return {
    configured: false,
    source: "none",
    apiKey: null,
    maskedKey: null,
    model,
  };
}

export async function listQuotations(): Promise<QuotationRecord[]> {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(quotations)
    .orderBy(desc(quotations.updatedAt), desc(quotations.createdAt));

  return rows.map((r) => ({
    id: r.id,
    protocol: r.protocol,
    status: r.status,
    condominium: r.condominium,
    analysisDate: r.analysisDate,
    recipient: r.recipient,
    service: r.service,
    description: r.description,
    kind: r.kind,
    category: r.category,
    suppliers: r.suppliers ?? [],
    items: r.items ?? [],
    analysis: r.analysis ?? {
      summary: "",
      recommendation: "",
      notes: "",
      outcome: {
        supplierId: "",
        referenceAmount: null,
        contractedAmount: null,
        confirmed: false,
      },
    },
    attachments: r.attachments ?? [],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getQuotationById(
  id: string
): Promise<QuotationRecord | null> {
  await ensureSeeded();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return null;

  const rows = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, id))
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    protocol: r.protocol,
    status: r.status,
    condominium: r.condominium,
    analysisDate: r.analysisDate,
    recipient: r.recipient,
    service: r.service,
    description: r.description,
    kind: r.kind,
    category: r.category,
    suppliers: r.suppliers ?? [],
    items: r.items ?? [],
    analysis: r.analysis ?? {
      summary: "",
      recommendation: "",
      notes: "",
      outcome: {
        supplierId: "",
        referenceAmount: null,
        contractedAmount: null,
        confirmed: false,
      },
    },
    attachments: r.attachments ?? [],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function generateNextProtocol(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MC-${year}-`;
  const rows = await db
    .select({ protocol: quotations.protocol })
    .from(quotations);

  let maxNum = 0;
  for (const r of rows) {
    if (r.protocol.startsWith(prefix)) {
      const n = parseInt(r.protocol.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

export async function ensureCondominiumExists(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db
    .insert(condominiums)
    .values({ name: trimmed })
    .onConflictDoNothing({ target: condominiums.name });
}

export async function listCondominiums(): Promise<CondominiumRecord[]> {
  await ensureSeeded();
  const [condoRows, countsRows] = await Promise.all([
    db.select().from(condominiums).orderBy(condominiums.name),
    db
      .select({
        condominium: quotations.condominium,
        count: sql<number>`count(*)::int`,
      })
      .from(quotations)
      .groupBy(quotations.condominium),
  ]);

  const countMap = new Map<string, number>();
  for (const c of countsRows) {
    countMap.set(c.condominium.trim().toLowerCase(), c.count);
  }

  // Also include any condominium names that exist only on quotations
  const existingKeys = new Set(condoRows.map((c) => c.name.trim().toLowerCase()));
  for (const c of countsRows) {
    const key = c.condominium.trim().toLowerCase();
    if (key && !existingKeys.has(key)) {
      await db
        .insert(condominiums)
        .values({ name: c.condominium.trim() })
        .onConflictDoNothing({ target: condominiums.name });
      existingKeys.add(key);
    }
  }

  const finalRows = await db.select().from(condominiums).orderBy(condominiums.name);
  return finalRows.map((c) => ({
    id: c.id,
    name: c.name,
    cnpj: c.cnpj,
    city: c.city,
    manager: c.manager,
    contactEmail: c.contactEmail,
    contactPhone: c.contactPhone,
    mapCount: countMap.get(c.name.trim().toLowerCase()) ?? 0,
  }));
}

export async function listPdfDownloads(limit = 20): Promise<PdfDownloadRecord[]> {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(pdfDownloads)
    .orderBy(desc(pdfDownloads.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    kind: r.kind,
    quotationId: r.quotationId,
    condominium: r.condominium,
    sizeBytes: r.sizeBytes,
    createdAt: r.createdAt.toISOString(),
  }));
}
