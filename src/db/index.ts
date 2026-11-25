import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

export function getDatabaseUrl(): string | null {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.NEON_DATABASE_URL,
    process.env.SUPABASE_DB_URL,
  ];
  for (const val of candidates) {
    const trimmed = val?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

function buildPoolConfig(rawUrl: string): PoolConfig {
  let connectionString = rawUrl;
  let isLocal = false;
  let explicitDisable = false;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local");

    const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
    if (sslMode === "disable") {
      explicitDisable = true;
    } else if (
      !isLocal &&
      (sslMode === "require" || sslMode === "prefer" || sslMode === "verify-ca")
    ) {
      // pg 8.20 overrides explicit `ssl` config when sslmode=require is left in the URL.
      parsed.searchParams.delete("sslmode");
      connectionString = parsed.toString();
    }
  } catch {
    isLocal = /localhost|127\.0\.0\.1/i.test(rawUrl);
  }

  return {
    connectionString,
    ssl: isLocal || explicitDisable ? undefined : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 15_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 7_000,
    lock_timeout: 2_000,
    query_timeout: 8_000,
  };
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlUrl?: string;
  __arenaNextJsPostgresqlDb?: NodePgDatabase;
};

export function getPool(): Pool {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "Banco de dados não configurado. Defina DATABASE_URL (ou POSTGRES_URL) nas variáveis de ambiente do projeto."
    );
  }

  if (
    !globalForDb.__arenaNextJsPostgresqlPool ||
    globalForDb.__arenaNextJsPostgresqlUrl !== url
  ) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool(buildPoolConfig(url));
    globalForDb.__arenaNextJsPostgresqlUrl = url;
    globalForDb.__arenaNextJsPostgresqlDb = undefined;
  }

  return globalForDb.__arenaNextJsPostgresqlPool;
}

export function getDb(): NodePgDatabase {
  const pool = getPool();
  if (!globalForDb.__arenaNextJsPostgresqlDb) {
    globalForDb.__arenaNextJsPostgresqlDb = drizzle(pool);
  }
  return globalForDb.__arenaNextJsPostgresqlDb;
}

export const db: NodePgDatabase = new Proxy({} as NodePgDatabase, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
