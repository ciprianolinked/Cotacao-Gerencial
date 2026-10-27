import { NextResponse } from "next/server";
import { createCondominium, listCondominiums } from "@/lib/server/quotations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const condominiums = await listCondominiums();
    return NextResponse.json({ condominiums });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar os condomínios.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const condominium = await createCondominium(payload ?? {});
    return NextResponse.json({ condominium }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao cadastrar o condomínio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
