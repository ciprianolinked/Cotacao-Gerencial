import { NewMapClient } from "@/components/NewMapClient";
import { listCondominiums } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function NewMapPage() {
  const condos = await listCondominiums();
  return <NewMapClient condominiumNames={condos.map((c) => c.name)} />;
}
