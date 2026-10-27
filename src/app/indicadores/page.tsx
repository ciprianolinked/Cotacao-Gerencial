import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { IndicatorsDashboard } from "@/components/IndicatorsDashboard";
import { listCondominiums, listQuotations } from "@/lib/server/quotations";
import type { QuotationRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Indicadores para assembleia · Gerencial" };

export default async function IndicatorsPage({ searchParams }: { searchParams: Promise<{ condominio?: string }> }) {
  const { condominio } = await searchParams;
  let records: QuotationRecord[] = [];
  let condominiums: string[] = [];
  let dbError = false;
  try {
    const [quotations, condos] = await Promise.all([listQuotations(), listCondominiums()]);
    records = quotations;
    condominiums = condos.map((item) => item.name);
  } catch {
    dbError = true;
  }
  return <AppShell><IndicatorsDashboard records={records} condominiums={condominiums} initialCondominium={condominio} dbError={dbError} /></AppShell>;
}
