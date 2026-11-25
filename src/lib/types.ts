export type QuotationStatus = "rascunho" | "em_analise" | "concluido";
export type QuotationKind = "servico" | "produtos";
export type CostType = "mao_obra" | "material" | "nao_discriminado";

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  deliveryDays: string;
  paymentTerms: string;
  validity: string;
  notes: string;
  purchaseUrl?: string;
  purchaseStore?: string;
  purchaseVerified?: boolean;
  purchaseSource?: "manual" | "documento" | "pesquisa";
}

export interface QuotationItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  prices: Record<string, number | null>;
  costType: CostType;
  purchaseUrl?: string;
  purchaseStore?: string;
  purchasePrice?: number | null;
  purchaseVerified?: boolean;
  purchaseSource?: "manual" | "documento" | "pesquisa";
}

export interface QuotationOutcome {
  supplierId: string;
  referenceAmount: number | null;
  contractedAmount: number | null;
  confirmed: boolean;
}

export interface QuotationAnalysis {
  summary: string;
  recommendation: string;
  notes: string;
  outcome: QuotationOutcome;
}

export interface QuotationAttachment {
  name: string;
  size: number;
  type: string;
  source: "ia" | "manual";
  analyzedAt: string;
}

export interface QuotationData {
  status: QuotationStatus;
  condominium: string;
  analysisDate: string;
  recipient: string;
  service: string;
  description: string;
  kind: QuotationKind;
  category: string;
  suppliers: Supplier[];
  items: QuotationItem[];
  analysis: QuotationAnalysis;
  attachments: QuotationAttachment[];
}

export interface QuotationRecord extends QuotationData {
  id: string;
  protocol: string;
  createdAt: string;
  updatedAt: string;
}

export interface CondominiumRecord {
  id: string;
  name: string;
  cnpj: string | null;
  city: string | null;
  manager: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  mapCount: number;
}

export interface PdfDownloadRecord {
  id: string;
  fileName: string;
  kind: "mapa" | "indicadores";
  quotationId: string | null;
  condominium: string | null;
  sizeBytes: number;
  createdAt: string;
}

export interface ProductSearchResult {
  query: string;
  title: string;
  url: string;
  store: string;
  price: number | null;
  verified: boolean;
  snippet?: string;
}

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

export const COST_TYPE_LABEL: Record<CostType, string> = {
  mao_obra: "Mão de obra",
  material: "Material",
  nao_discriminado: "Não discriminado",
};

export const STATUS_META: Record<
  QuotationStatus,
  { label: string; badgeClass: string; selectClass: string }
> = {
  rascunho: {
    label: "Rascunho",
    badgeClass: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    selectClass: "bg-slate-100 text-slate-600 ring-slate-200 border-slate-200",
  },
  em_analise: {
    label: "Em análise",
    badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    selectClass: "bg-amber-50 text-amber-700 ring-amber-200 border-amber-200",
  },
  concluido: {
    label: "Concluído",
    badgeClass: "bg-success-soft text-success ring-1 ring-success/20",
    selectClass: "bg-success-soft text-success ring-success/25 border-success/25",
  },
};

export const TRUSTED_STORES: { domain: string; label: string }[] = [
  { domain: "leroymerlin.com.br", label: "Leroy Merlin" },
  { domain: "telhanorte.com.br", label: "Telhanorte" },
  { domain: "sodimac.com.br", label: "Sodimac" },
  { domain: "cec.com.br", label: "C&C" },
  { domain: "obramax.com.br", label: "Obramax" },
  { domain: "cassol.com.br", label: "Cassol" },
  { domain: "ferreiracosta.com", label: "Ferreira Costa" },
  { domain: "dutramaquinas.com.br", label: "Dutra Máquinas" },
  { domain: "lojadomecanico.com.br", label: "Loja do Mecânico" },
  { domain: "kalunga.com.br", label: "Kalunga" },
  { domain: "kabum.com.br", label: "KaBuM!" },
  { domain: "mercadolivre.com.br", label: "Mercado Livre" },
  { domain: "amazon.com.br", label: "Amazon Brasil" },
  { domain: "magazineluiza.com.br", label: "Magazine Luiza" },
  { domain: "casasbahia.com.br", label: "Casas Bahia" },
  { domain: "pontofrio.com.br", label: "Ponto" },
  { domain: "intelbras.com", label: "Intelbras" },
  { domain: "eletrotrafo.com.br", label: "Eletrotrafo" },
  { domain: "andradedistribuidor.com.br", label: "Andrade Distribuidor" },
  { domain: "madeiramadeira.com.br", label: "MadeiraMadeira" },
];
