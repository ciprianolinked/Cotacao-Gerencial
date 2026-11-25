import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Inicialização preguiçosa do banco de dados.
 *
 * NUNCA lança erro no nível do módulo: o `next build` importa os módulos de
 * página (e deste arquivo) durante "Collecting page data" mesmo sem
 * `DATABASE_URL` definido. O erro só é lançado quando uma query realmente é
 * executada — o que permite que o build na Vercel seja verde e que a página
 * exiba um estado amigável ("banco não configurado") em vez de derrubar o
 * deploy inteiro.
 */

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Configure a variável de ambiente DATABASE_URL " +
        "no projeto Vercel / .env antes de liberar o site."
    );
  }
  return url;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDb(): NodePgDatabase<typeof schema> {
  const databaseUrl = getDatabaseUrl();

  const globalForDb = globalThis as typeof globalThis & {
    __arenaNextJsPostgresqlPool?: Pool;
    __arenaNextJsDrizzleDb?: NodePgDatabase<typeof schema>;
  };

  if (globalForDb.__arenaNextJsDrizzleDb) {
    return globalForDb.__arenaNextJsDrizzleDb;
  }

  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      max: 4,
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
    });

  // Reutiliza pool entre invocações numa mesma função serverless aquecida
  // (evita abrir conexões novas a cada request sem reter conexão morta demais).
  globalForDb.__arenaNextJsPostgresqlPool = pool;

  const db = drizzle(pool, { schema });
  globalForDb.__arenaNextJsDrizzleDb = db;

  return db;
}

// Compatibilidade de import com o código existente (`import { db } from "@/db"`).
// Cada propriedade é resolvida sob demanda, sem lançar erro no import.
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
