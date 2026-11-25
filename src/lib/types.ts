export type QuotationStatus = "rascunho" | "em_analise" | "concluido";
export type QuotationKind = "servico" | "produtos";
export type CostType = "mao_obra" | "material" | "nao_discriminado";

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  deliveryDays: string;
  paymentTerms: string;
  validity: string;
  notes: string;
};

export type QuoteItem = {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  prices: Record<string, number | null>;
  // Registros anteriores continuam válidos; itens antigos são considerados não discriminados.
  costType?: CostType;
};

/** Valores informados e confirmados pela equipe após uma contratação. */
export type QuotationOutcome = {
  supplierId: string;
  referenceAmount: number | null;
  contractedAmount: number | null;
  confirmed: boolean;
};

export type QuotationAnalysis = {
  summary: string;
  recommendation: string;
  notes: string;
  outcome?: QuotationOutcome;
};

export type AttachmentMeta = {
  name: string;
  size: number;
  type: string;
  source: "ia" | "manual";
  analyzedAt?: string;
};

export type QuotationDraft = {
  protocol?: string;
  status: QuotationStatus;
  condominium: string;
  analysisDate: string;
  recipient: string;
  service: string;
  description: string;
  kind: QuotationKind;
  category: string;
  suppliers: Supplier[];
  items: QuoteItem[];
  analysis: QuotationAnalysis;
  attachments: AttachmentMeta[];
};

export type QuotationRecord = QuotationDraft & {
  id: string;
  protocol: string;
  createdAt: string;
  updatedAt: string;
};

export type AiExtractionResult = {
  draft: Partial<QuotationDraft> & {
    suppliers: Supplier[];
    items: QuoteItem[];
  };
  mode: "ia" | "local";
  provider: string;
  warnings: string[];
  fileSummaries: { name: string; note: string }[];
};

export type CondominiumRecord = {
  id: string;
  name: string;
  city: string | null;
  manager: string | null;
  contactEmail?: string | null;
};
