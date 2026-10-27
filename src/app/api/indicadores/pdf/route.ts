import { NextResponse } from "next/server";
import { listQuotations } from "@/lib/server/quotations";
import { generateIndicatorsPdf } from "@/lib/server/pdf";
import { indicatorsPdfFilename, registerPdfDownload, safePdfFilename } from "@/lib/server/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const condominium = (params.get("condominio") ?? "").trim().slice(0, 200);
    const start = (params.get("inicio") ?? "").trim();
    const end = (params.get("fim") ?? "").trim();

    if ((start && !isoDate(start)) || (end && !isoDate(end))) {
      return NextResponse.json({ error: "O período contém uma data inválida. Atualize os filtros e tente novamente." }, { status: 400 });
    }
    if (start && end && start > end) {
      return NextResponse.json({ error: "A data inicial deve ser anterior à data final." }, { status: 400 });
    }

    const all = await listQuotations();
    const records = all.filter((record) =>
      (!condominium || record.condominium === condominium) &&
      (!start || record.analysisDate >= start) &&
      (!end || record.analysisDate <= end),
    );
    const fileName = safePdfFilename(indicatorsPdfFilename(condominium, start, end));
    const pdf = await generateIndicatorsPdf(records, { condominium, start, end });
    await registerPdfDownload({
      type: "indicadores",
      fileName,
      filters: { condominium: condominium || null, start: start || null, end: end || null, quotationCount: records.length },
    });

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(pdf.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar o PDF do dashboard de indicadores:", error);
    const message = error instanceof Error ? error.message : "Não foi possível gerar o PDF dos indicadores. Tente novamente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
