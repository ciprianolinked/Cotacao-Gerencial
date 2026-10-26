import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AttachmentMeta,
  QuoteItem,
  QuotationAnalysis,
  Supplier,
} from "@/lib/types";

export const condominiums = pgTable("condominiums", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  city: text("city"),
  manager: text("manager"),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quotations = pgTable(
  "quotations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    protocol: text("protocol").notNull(),
    status: text("status").notNull().default("em_analise"),
    condominium: text("condominium").notNull().default(""),
    analysisDate: date("analysis_date", { mode: "string" }).notNull(),
    recipient: text("recipient").notNull().default(""),
    service: text("service").notNull().default(""),
    description: text("description").notNull().default(""),
    kind: text("kind").notNull().default("servico"),
    category: text("category").notNull().default("Manutenção predial"),
    suppliers: jsonb("suppliers").$type<Supplier[]>().notNull().default([]),
    items: jsonb("items").$type<QuoteItem[]>().notNull().default([]),
    analysis: jsonb("analysis").$type<QuotationAnalysis>().notNull().default({
      summary: "",
      recommendation: "",
      notes: "",
    }),
    attachments: jsonb("attachments").$type<AttachmentMeta[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("quotations_date_idx").on(table.analysisDate)],
);

// Configurações do aplicativo (ex.: chave da IA gratuita configurada pelo painel).
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QuotationRow = typeof quotations.$inferSelect;
export type CondominiumRow = typeof condominiums.$inferSelect;
export type AppSettingRow = typeof appSettings.$inferSelect;
