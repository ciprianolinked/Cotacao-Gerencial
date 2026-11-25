import type { Metadata } from "next";
import { IndicatorsClient } from "@/components/IndicatorsClient";
import { DbUnavailable } from "@/components/DbUnavailable";
import { safeLoad } from "@/lib/safe-load";
import { listPdfDownloads, listQuotations } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Indicadores para assembleia · Gerencial",
};

export default async function IndicatorsPage() {
  const [quotationsRes, downloadsRes] = await Promise.all([
    safeLoad(() => listQuotations()),
    safeLoad(() => listPdfDownloads(20)),
  ]);

  const error = quotationsRes.error || downloadsRes.error;

  if (error || !quotationsRes.data) {
    return <DbUnavailable reason={error ?? undefined} />;
  }

  return (
    <IndicatorsClient
      quotations={quotationsRes.data}
      initialDownloads={downloadsRes.data ?? []}
    />
  );
}
