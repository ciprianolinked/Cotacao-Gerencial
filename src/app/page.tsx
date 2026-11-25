import { DashboardClient } from "@/components/DashboardClient";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import {
  DEFAULT_GEMINI_MODEL,
  formatDatabaseError,
  getAiConfig,
  listCondominiums,
  listQuotations,
} from "@/lib/server-data";
import type { CondominiumRecord, QuotationRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let quotations: QuotationRecord[] = [];
  let condominiums: CondominiumRecord[] = [];
  let aiConfigured = false;
  let aiModel = DEFAULT_GEMINI_MODEL;
  let dbError: string | null = null;

  try {
    const [qList, cList, aiCfg] = await Promise.all([
      listQuotations(),
      listCondominiums(),
      getAiConfig(),
    ]);
    quotations = qList;
    condominiums = cList;
    aiConfigured = aiCfg.configured;
    aiModel = aiCfg.model;
  } catch (err) {
    console.error("HomePage database error:", err);
    dbError = formatDatabaseError(err);
    const aiCfg = await getAiConfig().catch(() => null);
    if (aiCfg) {
      aiConfigured = aiCfg.configured;
      aiModel = aiCfg.model;
    }
  }

  return (
    <>
      {dbError && <DbErrorBanner message={dbError} />}
      <DashboardClient
        quotations={quotations}
        condominiums={condominiums}
        aiConfigured={aiConfigured}
        aiModel={aiModel}
      />
    </>
  );
}
