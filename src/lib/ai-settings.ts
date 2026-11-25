import { eq, inArray, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { appSettings } from "@/db/schema";
import { databaseErrorCode, ensureSettingsSchema } from "@/db/settings";

export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";
const SETTINGS_KEYS = ["gemini_api_key", "gemini_model"];

export interface AiConfig {
  configured: boolean;
  source: "env" | "db" | "none";
  apiKey: string | null;
  maskedKey: string | null;
  model: string;
}
export type PublicAiConfig = Omit<AiConfig, "apiKey">;

export function maskApiKey(key: string): string {
  const value = key.trim();
  return value.length > 8 ? `${value.slice(0, 4)}••••${value.slice(-4)}` : "••••••••";
}

export function publicAiConfig(config: AiConfig): PublicAiConfig {
  return {
    configured: config.configured,
    source: config.source,
    maskedKey: config.maskedKey,
    model: config.model,
  };
}

export function validGeminiModel(value: unknown): value is string {
  return typeof value === "string" && /^gemini-[a-z0-9][a-z0-9.-]{0,89}$/.test(value);
}

export async function getAiConfig(options: { strict?: boolean } = {}): Promise<AiConfig> {
  const envKey = process.env.GEMINI_API_KEY?.trim() || null;
  const envModel = process.env.GEMINI_MODEL?.trim();
  let dbKey: string | null = null;
  let dbModel: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      await ensureSettingsSchema();
      const rows = await db.select({ key: appSettings.key, value: appSettings.value })
        .from(appSettings).where(inArray(appSettings.key, SETTINGS_KEYS));
      dbKey = rows.find((row) => row.key === "gemini_api_key")?.value.trim() || null;
      dbModel = rows.find((row) => row.key === "gemini_model")?.value.trim() || null;
    } catch (error) {
      if (options.strict) throw error;
      console.warn("AI settings unavailable; environment fallback", { code: databaseErrorCode(error) });
    }
  }

  const key = dbKey || envKey;
  return {
    configured: Boolean(key),
    source: dbKey ? "db" : envKey ? "env" : "none",
    apiKey: key,
    maskedKey: key ? maskApiKey(key) : null,
    model: validGeminiModel(dbModel) ? dbModel : validGeminiModel(envModel) ? envModel : DEFAULT_GEMINI_MODEL,
  };
}

/** Atomic persistence only. No network call to Google belongs in this operation. */
export async function saveAiConfig(apiKey: string, requestedModel?: string): Promise<PublicAiConfig> {
  await ensureSettingsSchema();
  const model = await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL statement_timeout = '5000ms'`);
    await tx.execute(sql`SET LOCAL lock_timeout = '1500ms'`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73421902)`);
    const previous = await tx.select({ key: appSettings.key, value: appSettings.value })
      .from(appSettings).where(inArray(appSettings.key, SETTINGS_KEYS));
    const oldKey = previous.find((row) => row.key === "gemini_api_key")?.value;
    const oldModel = previous.find((row) => row.key === "gemini_model")?.value;
    const nextModel = validGeminiModel(requestedModel)
      ? requestedModel
      : oldKey === apiKey && validGeminiModel(oldModel)
        ? oldModel
        : DEFAULT_GEMINI_MODEL;

    await tx.insert(appSettings).values([
      { key: "gemini_api_key", value: apiKey, updatedAt: new Date() },
      { key: "gemini_model", value: nextModel, updatedAt: new Date() },
    ]).onConflictDoUpdate({
      target: appSettings.key,
      set: { value: sql`excluded.value`, updatedAt: sql`excluded.updated_at` },
    });
    return nextModel;
  });
  return { configured: true, source: "db", maskedKey: maskApiKey(apiKey), model };
}

/** Persist the winning model only if the tested key is still the configured key. */
export async function rememberWorkingModel(apiKey: string, model: string): Promise<boolean> {
  if (!isDatabaseConfigured() || !validGeminiModel(model)) return false;
  await ensureSettingsSchema();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL statement_timeout = '4000ms'`);
    await tx.execute(sql`SET LOCAL lock_timeout = '1500ms'`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73421902)`);
    const [row] = await tx.select({ value: appSettings.value }).from(appSettings)
      .where(eq(appSettings.key, "gemini_api_key")).limit(1);
    const configuredKey = row?.value.trim() || process.env.GEMINI_API_KEY?.trim();
    if (configuredKey !== apiKey) return false;
    await tx.insert(appSettings).values({ key: "gemini_model", value: model, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: model, updatedAt: new Date() } });
    return true;
  });
}

export async function removeAiConfig(): Promise<PublicAiConfig> {
  await ensureSettingsSchema();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL statement_timeout = '4000ms'`);
    await tx.execute(sql`SET LOCAL lock_timeout = '1500ms'`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73421902)`);
    await tx.delete(appSettings).where(inArray(appSettings.key, SETTINGS_KEYS));
  });
  const key = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();
  return {
    configured: Boolean(key),
    source: key ? "env" : "none",
    maskedKey: key ? maskApiKey(key) : null,
    model: validGeminiModel(model) ? model : DEFAULT_GEMINI_MODEL,
  };
}
