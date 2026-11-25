import type { Metadata } from "next";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { IndicatorsClient } from "@/components/IndicatorsClient";
import {
  formatDatabaseError,
  listPdfDownloads,
  listQuotations,
} from "@/lib/server-data";
import type { PdfDownloadRecord, QuotationRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Indicadores para assembleia · Gerencial",
};

export default async function IndicatorsPage() {
  let quotations: QuotationRecord[] = [];
  let downloads: PdfDownloadRecord[] = [];
  let dbError: string | null = null;

  try {
    [quotations, downloads] = await Promise.all([
      listQuotations(),
      listPdfDownloads(20),
    ]);
  } catch (err) {
    console.error("IndicatorsPage database error:", err);
    dbError = formatDatabaseError(err);
  }

  return (
    <>
      {dbError && <DbErrorBanner message={dbError} />}
      <IndicatorsClient quotations={quotations} initialDownloads={downloads} />
    </>
  );
}
