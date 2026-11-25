import { NextResponse } from "next/server";
import { db } from "@/db";
import { condominiums } from "@/db/schema";
import { listCondominiums } from "@/lib/server-data";

function normalizeCnpj(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

export async function GET() {
  try {
    const list = await listCondominiums();
    return NextResponse.json({ condominiums: list });
  } catch (error) {
    console.error("GET /api/condominiums error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar condomínios." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      cnpj?: string | null;
      city?: string | null;
      manager?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
    };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome do condomínio ou associação." },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(condominiums)
      .values({
        name,
        cnpj: normalizeCnpj(body.cnpj),
        city: body.city?.trim() || null,
        manager: body.manager?.trim() || null,
        contactEmail: body.contactEmail?.trim() || null,
        contactPhone: body.contactPhone?.trim() || null,
      })
      .returning();

    return NextResponse.json(
      {
        condominium: {
          id: created.id,
          name: created.name,
          cnpj: created.cnpj,
          city: created.city,
          manager: created.manager,
          contactEmail: created.contactEmail,
          contactPhone: created.contactPhone,
          mapCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const pgCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (pgCode === "23505") {
      return NextResponse.json(
        { error: "Já existe um condomínio cadastrado com esse nome." },
        { status: 409 }
      );
    }
    console.error("POST /api/condominiums error:", error);
    return NextResponse.json(
      { error: "Não foi possível cadastrar o condomínio." },
      { status: 500 }
    );
  }
}
