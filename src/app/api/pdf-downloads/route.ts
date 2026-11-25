import { NextResponse } from "next/server";
import { listPdfDownloads } from "@/lib/server-data";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const downloads = await listPdfDownloads(25);
    return NextResponse.json({ downloads });
  } catch (error) {
    console.error("GET /api/pdf-downloads error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar histórico de downloads." },
      { status: 500 }
    );
  }
}
