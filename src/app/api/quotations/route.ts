import { NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { quotations } from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;
import {
  ensureCondominiumExists,
  generateNextProtocol,
  listQuotations,
} from "@/lib/server-data";
import { createBlankQuotation } from "@/lib/calculations";
import type { QuotationData } from "@/lib/types";

export async function GET() {
  try {
    const data = await listQuotations();
    return NextResponse.json({ quotations: data });
  } catch (error) {
    console.error("GET /api/quotations error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar mapas de cotação." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = (await request.json().catch(() => ({}))) as Partial<QuotationData>;
    const draft = createBlankQuotation(body);
    const protocol = await generateNextProtocol();

    if (draft.condominium.trim()) {
      await ensureCondominiumExists(draft.condominium.trim());
    }

    const [created] = await db
      .insert(quotations)
      .values({
        protocol,
        status: draft.status,
        condominium: draft.condominium.trim() || "Condomínio a definir",
        analysisDate: draft.analysisDate,
        recipient: draft.recipient.trim() || "Síndico(a) e Conselho Consultivo",
        service: draft.service.trim() || "Nova cotação",
        description: draft.description,
        kind: draft.kind,
        category: draft.category,
        suppliers: draft.suppliers,
        items: draft.items,
        analysis: draft.analysis,
        attachments: draft.attachments,
      })
      .returning();

    return NextResponse.json(
      {
        id: created.id,
        protocol: created.protocol,
        quotation: {
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/quotations error:", error);
    return NextResponse.json(
      { error: "Não foi possível criar o mapa de cotação." },
      { status: 500 }
    );
  }
}
