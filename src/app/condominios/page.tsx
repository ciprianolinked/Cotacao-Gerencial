import { CondominiumsClient } from "@/components/CondominiumsClient";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { formatDatabaseError, listCondominiums } from "@/lib/server-data";
import type { CondominiumRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CondominiumsPage() {
  let list: CondominiumRecord[] = [];
  let dbError: string | null = null;

  try {
    list = await listCondominiums();
  } catch (err) {
    console.error("CondominiumsPage database error:", err);
    dbError = formatDatabaseError(err);
  }

  return (
    <>
      {dbError && <DbErrorBanner message={dbError} />}
      <CondominiumsClient initial={list} />
    </>
  );
}
