import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { IndicatorsDashboard } from "@/components/IndicatorsDashboard";
import { listPdfExports } from "@/lib/server/downloads";
import { listCondominiums, listQuotations } from "@/lib/server/quotations";
import type { PdfExportRecord } from "@/lib/server/downloads";
import type { QuotationRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Indicadores para assembleia · Gerencial" };

export default async function IndicatorsPage({ searchParams }: { searchParams: Promise<{ condominio?: string }> }) {
  const { condominio } = await searchParams;
  let records: QuotationRecord[] = [];
  let condominiums: string[] = [];
  let downloads: PdfExportRecord[] = [];
  let dbError = false;
  try {
    const [quotations, condos, exports] = await Promise.all([listQuotations(), listCondominiums(), listPdfExports(10)]);
    records = quotations;
    condominiums = condos.map((item) => item.name);
    downloads = exports;
  } catch {
    dbError = true;
  }
  return (
    <AppShell>
      <IndicatorsDashboard
        records={records}
        condominiums={condominiums}
        initialCondominium={condominio}
        initialDownloads={downloads}
        dbError={dbError}
      />
    </AppShell>
  );
}
