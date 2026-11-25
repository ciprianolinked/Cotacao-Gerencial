import type { Metadata } from "next";
import { IndicatorsClient } from "@/components/IndicatorsClient";
import { listPdfDownloads, listQuotations } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Indicadores para assembleia · Gerencial",
};

export default async function IndicatorsPage() {
  const [quotations, downloads] = await Promise.all([
    listQuotations(),
    listPdfDownloads(20),
  ]);

  return (
    <IndicatorsClient quotations={quotations} initialDownloads={downloads} />
  );
}
