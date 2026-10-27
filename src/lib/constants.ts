import type { CostType, QuotationKind, QuotationStatus } from "./types";

export const COST_TYPE_LABEL: Record<CostType, string> = {
  mao_obra: "Mão de obra",
  material: "Material",
  nao_discriminado: "Não discriminado",
};

export const COST_TYPES: CostType[] = ["mao_obra", "material", "nao_discriminado"];

export const CATEGORIES = [
  "Manutenção predial",
  "Elétrica",
  "Hidráulica",
  "Piscina",
  "Limpeza e conservação",
  "Jardinagem",
  "Segurança e portaria",
  "Obras e reformas",
  "Administrativo",
  "Outros",
] as const;

export const UNITS = [
  "un",
  "serviço",
  "mês",
  "m²",
  "m",
  "kg",
  "L",
  "cx",
  "hora",
  "vb (verba)",
] as const;

export const STATUS_LABEL: Record<QuotationStatus, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  concluido: "Concluído",
};

export const STATUS_STYLE: Record<QuotationStatus, string> = {
  rascunho: "bg-slate-100 text-slate-600 ring-slate-200",
  em_analise: "bg-amber-50 text-amber-700 ring-amber-200",
  concluido: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export const KIND_LABEL: Record<QuotationKind, string> = {
  servico: "Serviço",
  produtos: "Produtos",
};

export const MAX_SUPPLIERS = 5;
export const MAX_FILES = 6;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
