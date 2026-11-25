import { sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "./schema";

let ready: Promise<void> | undefined;

/** Only SQLSTATE is logged; Drizzle errors can contain bound secrets. */
export function databaseErrorCode(error: unknown): string {
  let current = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const detail = current as { code?: unknown; cause?: unknown };
    if (typeof detail.code === "string") return detail.code;
    current = detail.cause;
  }
  return "DATABASE_UNAVAILABLE";
}

/**
 * Credential operations must not wait for DDL on every quotation table.
 * Existing installations take only a metadata SELECT; fresh ones create this table.
 */
export async function ensureSettingsSchema(): Promise<void> {
  if (!ready) {
    ready = prepare().catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  await ready;
}

async function prepare() {
  try {
    await db.select({ key: appSettings.key, value: appSettings.value, updatedAt: appSettings.updatedAt })
      .from(appSettings).limit(0);
    return;
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code !== "42P01" && code !== "42703") throw error;
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL statement_timeout = '5000ms'`);
    await tx.execute(sql`SET LOCAL lock_timeout = '1500ms'`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73421901)`);
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS app_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await tx.execute(sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
  });
}
