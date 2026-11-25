import { sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { formatDatabaseError } from "@/lib/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const configured = isDatabaseConfigured();
  try {
    await db.execute(sql`select 1`);
    await ensureSchema();
    return Response.json({
      ok: true,
      databaseConfigured: configured,
      schemaReady: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/health error:", error);
    return Response.json(
      {
        ok: false,
        databaseConfigured: configured,
        schemaReady: false,
        error: formatDatabaseError(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
