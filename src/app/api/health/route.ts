import { db, isDatabaseConfigured } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json(
      {
        ok: false,
        configured: false,
        error:
          "DATABASE_URL ausente. Configure a variável de ambiente no projeto Vercel.",
      },
      { status: 503 }
    );
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, configured: true });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json(
      { ok: false, configured: true, error: "Banco de dados inacessível." },
      { status: 500 }
    );
  }
}
