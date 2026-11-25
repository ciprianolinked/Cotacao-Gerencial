import { NewMapClient } from "@/components/NewMapClient";
import { DbUnavailable } from "@/components/DbUnavailable";
import { safeLoad } from "@/lib/safe-load";
import { listCondominiums } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function NewMapPage() {
  const { data, error } = await safeLoad(() => listCondominiums());

  if (error || !data) {
    return <DbUnavailable reason={error ?? undefined} />;
  }

  return <NewMapClient condominiumNames={data.map((c) => c.name)} />;
}
