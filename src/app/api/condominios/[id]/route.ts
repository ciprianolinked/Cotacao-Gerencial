import { NextResponse } from "next/server";
import { deleteCondominium, getCondominium, updateCondominium } from "@/lib/server/quotations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const condominium = await getCondominium(id);
  if (!condominium) {
    return NextResponse.json({ error: "Condomínio não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ condominium });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const payload = await request.json();
    const condominium = await updateCondominium(id, payload ?? {});
    if (!condominium) {
      return NextResponse.json({ error: "Condomínio não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ condominium });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar o condomínio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const result = await deleteCondominium(id);
    if (!result.ok) {
      return NextResponse.json({ error: "Condomínio não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, quotationCount: result.quotationCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir o condomínio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
