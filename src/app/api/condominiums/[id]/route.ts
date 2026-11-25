import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { condominiums, quotations } from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

function normalizeCnpj(raw?: string | null): string | null | undefined {
  if (raw === undefined) return undefined;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await context.params;
    const existingRows = await db
      .select()
      .from(condominiums)
      .where(eq(condominiums.id, id))
      .limit(1);

    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json(
        { error: "Condomínio não encontrado." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      cnpj?: string | null;
      city?: string | null;
      manager?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
    };

    const nextName = body.name?.trim() || existing.name;
    const nextCnpj = normalizeCnpj(body.cnpj);

    const [updated] = await db
      .update(condominiums)
      .set({
        name: nextName,
        cnpj: nextCnpj === undefined ? existing.cnpj : nextCnpj,
        city: body.city !== undefined ? body.city?.trim() || null : existing.city,
        manager:
          body.manager !== undefined ? body.manager?.trim() || null : existing.manager,
        contactEmail:
          body.contactEmail !== undefined
            ? body.contactEmail?.trim() || null
            : existing.contactEmail,
        contactPhone:
          body.contactPhone !== undefined
            ? body.contactPhone?.trim() || null
            : existing.contactPhone,
        updatedAt: new Date(),
      })
      .where(eq(condominiums.id, id))
      .returning();

    // Propagate rename to linked quotations so portfolio stays consistent
    if (nextName !== existing.name) {
      await db
        .update(quotations)
        .set({ condominium: nextName, updatedAt: new Date() })
        .where(eq(quotations.condominium, existing.name));
    }

    return NextResponse.json({ condominium: updated });
  } catch (error) {
    console.error("PATCH /api/condominiums/[id] error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar condomínio." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await context.params;
    await db.delete(condominiums).where(eq(condominiums.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/condominiums/[id] error:", error);
    return NextResponse.json(
      { error: "Erro ao remover cadastro." },
      { status: 500 }
    );
  }
}
