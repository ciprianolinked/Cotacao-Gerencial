import { DashboardClient } from "@/components/DashboardClient";
import { DbUnavailable } from "@/components/DbUnavailable";
import { safeLoad } from "@/lib/safe-load";
import {
  getAiConfig,
  listCondominiums,
  listQuotations,
} from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [quotationsRes, condosRes, aiRes] = await Promise.all([
    safeLoad(() => listQuotations()),
    safeLoad(() => listCondominiums()),
    safeLoad(() => getAiConfig()),
  ]);

  const error = quotationsRes.error || condosRes.error || aiRes.error;

  if (error || !quotationsRes.data || !condosRes.data) {
    return <DbUnavailable reason={error ?? undefined} />;
  }

  const aiConfigured = aiRes.data?.configured ?? false;
  const aiModel = aiRes.data?.model ?? "";

  return (
    <DashboardClient
      quotations={quotationsRes.data}
      condominiums={condosRes.data}
      aiConfigured={aiConfigured}
      aiModel={aiModel}
    />
  );
}
