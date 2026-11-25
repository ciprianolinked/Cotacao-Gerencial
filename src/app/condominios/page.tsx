import { CondominiumsClient } from "@/components/CondominiumsClient";
import { listCondominiums } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function CondominiumsPage() {
  const list = await listCondominiums();
  return <CondominiumsClient initial={list} />;
}
