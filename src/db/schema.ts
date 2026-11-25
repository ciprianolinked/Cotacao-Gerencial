import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  QuotationAnalysis,
  QuotationAttachment,
  QuotationItem,
  QuotationKind,
  QuotationStatus,
  Supplier,
} from "@/lib/types";

export const condominiums = pgTable("condominiums", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  cnpj: text("cnpj"),
  city: text("city"),
  manager: text("manager"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const quotations = pgTable("quotations", {
  id: uuid("id").defaultRandom().primaryKey(),
  protocol: text("protocol").notNull(),
  status: text("status").$type<QuotationStatus>().notNull().default("em_analise"),
  condominium: text("condominium").notNull(),
  analysisDate: text("analysis_date").notNull(),
  recipient: text("recipient")
    .notNull()
    .default("Síndico(a) e Conselho Consultivo"),
  service: text("service").notNull(),
  description: text("description").notNull().default(""),
  kind: text("kind").$type<QuotationKind>().notNull().default("servico"),
  category: text("category").notNull().default("Manutenção predial"),
  suppliers: jsonb("suppliers").$type<Supplier[]>().notNull().default([]),
  items: jsonb("items").$type<QuotationItem[]>().notNull().default([]),
  analysis: jsonb("analysis").$type<QuotationAnalysis>().notNull(),
  attachments: jsonb("attachments")
    .$type<QuotationAttachment[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const pdfDownloads = pgTable("pdf_downloads", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  kind: text("kind").$type<"mapa" | "indicadores">().notNull().default("mapa"),
  quotationId: uuid("quotation_id"),
  condominium: text("condominium"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
