import { getPool } from "./index";

const globalForBootstrap = globalThis as typeof globalThis & {
  __gerencialSchemaPromise?: Promise<void> | null;
};

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS condominiums (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    cnpj text,
    city text,
    manager text,
    contact_email text,
    contact_phone text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS cnpj text`,
  `ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS city text`,
  `ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS manager text`,
  `ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS contact_email text`,
  `ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS contact_phone text`,
  `ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
  `ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,

  `CREATE TABLE IF NOT EXISTS quotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol text NOT NULL,
    status text NOT NULL DEFAULT 'em_analise',
    condominium text NOT NULL,
    analysis_date text NOT NULL,
    recipient text NOT NULL DEFAULT 'Síndico(a) e Conselho Consultivo',
    service text NOT NULL,
    description text NOT NULL DEFAULT '',
    kind text NOT NULL DEFAULT 'servico',
    category text NOT NULL DEFAULT 'Manutenção predial',
    suppliers jsonb NOT NULL DEFAULT '[]'::jsonb,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
    attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'servico'`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Manutenção predial'`,

  `CREATE TABLE IF NOT EXISTS pdf_downloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    kind text NOT NULL DEFAULT 'mapa',
    quotation_id uuid,
    condominium text,
    size_bytes integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS app_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_quotations_updated_at ON quotations (updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_quotations_condominium ON quotations (condominium)`,
  `CREATE INDEX IF NOT EXISTS idx_pdf_downloads_created_at ON pdf_downloads (created_at DESC)`,
];

export async function ensureSchema(): Promise<void> {
  if (!globalForBootstrap.__gerencialSchemaPromise) {
    globalForBootstrap.__gerencialSchemaPromise = runBootstrap().catch((err) => {
      globalForBootstrap.__gerencialSchemaPromise = null;
      throw err;
    });
  }
  await globalForBootstrap.__gerencialSchemaPromise;
}

async function runBootstrap(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    // pgcrypto fornece gen_random_uuid() em versões mais antigas de Postgres (em PG 13+ já é nativo)
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`).catch(() => {
      // Alguns bancos gerenciados (ex.: Neon/Supabase) já possuem gen_random_uuid() nativo sem permissão de CREATE EXTENSION
    });
    for (const stmt of SCHEMA_STATEMENTS) {
      await client.query(stmt);
    }
  } finally {
    client.release();
  }
}
