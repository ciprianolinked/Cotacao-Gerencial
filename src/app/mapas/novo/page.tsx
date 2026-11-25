import { DbErrorBanner } from "@/components/DbErrorBanner";
import { NewMapClient } from "@/components/NewMapClient";
import { formatDatabaseError, listCondominiums } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function NewMapPage() {
  let names: string[] = [];
  let dbError: string | null = null;

  try {
    const condos = await listCondominiums();
    names = condos.map((c) => c.name);
  } catch (err) {
    console.error("NewMapPage database error:", err);
    dbError = formatDatabaseError(err);
  }

  return (
    <>
      {dbError && <DbErrorBanner message={dbError} />}
      <NewMapClient condominiumNames={names} />
    </>
  );
}
