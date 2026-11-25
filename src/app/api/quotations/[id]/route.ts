import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";
export const maxDuration = 30;
import { quotations } from "@/db/schema";
import { ensureCondominiumExists, getQuotationById } from "@/lib/server-data";
import type { QuotationData } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const item = await getQuotationById(id);
    if (!item) {
      return NextResponse.json({ error: "Mapa não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ quotation: item });
  } catch (error) {
    console.error("GET /api/quotations/[id] error:", error);
    return NextResponse.json({ error: "Erro ao buscar mapa." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await getQuotationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Mapa não encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as Partial<QuotationData>;
    const nextCondo = (body.condominium ?? existing.condominium).trim();
    if (nextCondo) {
      await ensureCondominiumExists(nextCondo);
    }

    const [updated] = await db
      .update(quotations)
      .set({
        status: body.status ?? existing.status,
        condominium: nextCondo || existing.condominium,
        analysisDate: body.analysisDate ?? existing.analysisDate,
        recipient: body.recipient ?? existing.recipient,
        service: body.service ?? existing.service,
        description: body.description ?? existing.description,
        kind: body.kind ?? existing.kind,
        category: body.category ?? existing.category,
        suppliers: body.suppliers ?? existing.suppliers,
        items: body.items ?? existing.items,
        analysis: body.analysis ?? existing.analysis,
        attachments: body.attachments ?? existing.attachments,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id))
      .returning();

    return NextResponse.json({
      quotation: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PUT /api/quotations/[id] error:", error);
    return NextResponse.json(
      { error: "Erro ao salvar alterações do mapa." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await getQuotationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Mapa não encontrado." }, { status: 404 });
    }

    await db.delete(quotations).where(eq(quotations.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/quotations/[id] error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir mapa de cotação." },
      { status: 500 }
    );
  }
}
