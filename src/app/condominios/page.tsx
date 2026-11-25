import { CondominiumsClient } from "@/components/CondominiumsClient";
import { DbUnavailable } from "@/components/DbUnavailable";
import { safeLoad } from "@/lib/safe-load";
import { listCondominiums } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function CondominiumsPage() {
  const { data, error } = await safeLoad(() => listCondominiums());

  if (error || !data) {
    return <DbUnavailable reason={error ?? undefined} />;
  }

  return <CondominiumsClient initial={data} />;
}
