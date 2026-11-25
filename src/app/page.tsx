import { DashboardClient } from "@/components/DashboardClient";
import {
  getAiConfig,
  listCondominiums,
  listQuotations,
} from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [quotations, condominiums, aiCfg] = await Promise.all([
    listQuotations(),
    listCondominiums(),
    getAiConfig(),
  ]);

  return (
    <DashboardClient
      quotations={quotations}
      condominiums={condominiums}
      aiConfigured={aiCfg.configured}
      aiModel={aiCfg.model}
    />
  );
}
