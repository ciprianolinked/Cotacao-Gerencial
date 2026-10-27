import type {
  ItemNature,
  QuotationAnalysis,
  QuotationDraft,
  QuotationKind,
  QuotationStatus,
  QuoteItem,
  Supplier,
} from "./types";
import { CATEGORIES, MAX_SUPPLIERS, NATURE_VALUES } from "./constants";

/** Ações que caracterizam mão de obra, mesmo quando citam um material ("instalação de bomba"). */
const LABOR_ACTIONS =
  /(m[ãa]o\s*de\s*obra|instala[çc][ãa]o|instalar|execu[çc][ãa]o|executar|aplica[çc][ãa]o|montagem|montar|manuten[çc][ãa]o|limpeza|pintura|reparo|reparar|conserto|troca\s+de|substitui[çc][ãa]o|revis[ãa]o|hora\s*t[ée]cnica|visita\s*t[ée]cnica|m[ãa]o\s*obra|di[áa]ria|empreitada|vistoria|laudo|projeto|assist[êe]ncia|servi[çc]o)/i;

/** Itens fornecidos (peças, insumos e equipamentos). */
const MATERIAL_HINTS =
  /(material|materiais|tubo|cano|cabo|fio|disjuntor|registro|tinta|cimento|areia|pe[çc]a|pe[çc]as|bomba|motor|filtro|l[âa]mpada|lumin[áa]ria|conex[ãa]o|parafuso|v[áa]lvula|torneira|rolo|saco|kit|equipamento|insumo|produto)/i;

/** Unidades típicas de mão de obra. */
const LABOR_UNITS = /^(hora|h|m[êe]s|di[áa]ria|servi[çc]o|vb.*)$/i;

/**
 * Classifica um item entre material e mão de obra.
 * A ação tem prioridade: "instalação de bomba" é mão de obra, "bomba" é material.
 */
export function inferNature(description: string, unit = ""): ItemNature {
  const text = `${description} ${unit}`.trim();
  if (!text) return "outros";

  const hasLabor = LABOR_ACTIONS.test(text);
  const mentionsMaterialWord = /(material|materiais)/i.test(description);
  // "Material e mão de obra inclusos" não dá para separar.
  if (hasLabor && mentionsMaterialWord) return "outros";
  if (hasLabor) return "mao_de_obra";
  if (MATERIAL_HINTS.test(text)) return "material";
  if (LABOR_UNITS.test(unit.trim())) return "mao_de_obra";
  return "outros";
}

export function normalizeNature(value: unknown, description = "", unit = ""): ItemNature {
  const raw = typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
  if (raw === "mao_de_obra" || raw === "mão_de_obra" || raw === "labor" || raw === "servico" || raw === "serviço") {
    return "mao_de_obra";
  }
  if (raw === "material" || raw === "materials" || raw === "produto" || raw === "produtos") return "material";
  if (raw === "outros" || raw === "outro" || raw === "other") return "outros";
  return inferNature(description, unit);
}

export function uid(prefix = ""): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}${Date.now().toString(36)}${random}`;
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (!value) return "R$ 0,00";
  if (value >= 1_000_000) {
    return `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value / 1_000_000)} mi`;
  }
  if (value >= 1_000) {
    return `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value / 1_000)} mil`;
  }
  return formatCurrency(value);
}

export function parseCurrencyInput(raw: string): number | null {
  const clean = raw.replace(/[^\d,.-]/g, "").trim();
  if (!clean) return null;
  let normalized = clean;
  if (clean.includes(",")) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function itemTotal(item: QuoteItem, supplierId: string): number | null {
  const price = item.prices?.[supplierId];
  if (price === null || price === undefined || Number.isNaN(price)) return null;
  return round2(price * (item.quantity || 0));
}

export function supplierTotal(items: QuoteItem[], supplierId: string): number | null {
  let total = 0;
  let priced = 0;
  for (const item of items) {
    const value = itemTotal(item, supplierId);
    if (value !== null) {
      total += value;
      priced += 1;
    }
  }
  return priced > 0 ? round2(total) : null;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type NatureTotals = { material: number; mao_de_obra: number; outros: number };

/** Soma os valores de um fornecedor separando material, mão de obra e outros. */
export function supplierTotalsByNature(items: QuoteItem[], supplierId: string): NatureTotals {
  const totals: NatureTotals = { material: 0, mao_de_obra: 0, outros: 0 };
  for (const item of items) {
    const value = itemTotal(item, supplierId);
    if (value === null) continue;
    totals[item.nature ?? "outros"] = round2((totals[item.nature ?? "outros"] ?? 0) + value);
  }
  return totals;
}

export type SupplierRanking = {
  supplier: Supplier;
  total: number | null;
  coverage: number;
  isBest: boolean;
  byNature: NatureTotals;
};

export function rankSuppliers(items: QuoteItem[], suppliers: Supplier[]): SupplierRanking[] {
  const rows = suppliers.map((supplier) => {
    const total = supplierTotal(items, supplier.id);
    const coverage = items.filter((item) => itemTotal(item, supplier.id) !== null).length;
    return { supplier, total, coverage, isBest: false, byNature: supplierTotalsByNature(items, supplier.id) };
  });
  const comparable = rows.filter((row) => row.total !== null);
  if (comparable.length > 0) {
    const best = comparable.reduce((acc, row) => ((row.total as number) < (acc.total as number) ? row : acc));
    best.isBest = true;
  }
  return rows;
}

export type QuotationMetrics = {
  rankings: SupplierRanking[];
  best: SupplierRanking | null;
  highest: SupplierRanking | null;
  savings: number;
  savingsPercent: number;
  itemCount: number;
  supplierCount: number;
  isComparable: boolean;
  /** Composição da melhor proposta entre material e mão de obra. */
  bestByNature: NatureTotals;
  /** Economia separada por natureza (melhor x mais cara, item a item). */
  savingsByNature: NatureTotals;
};

export function computeMetrics(draft: Pick<QuotationDraft, "items" | "suppliers">): QuotationMetrics {
  const rankings = rankSuppliers(draft.items, draft.suppliers);
  const priced = rankings.filter((row) => row.total !== null);
  const best = priced.find((row) => row.isBest) ?? null;
  const highest =
    priced.length > 1
      ? priced.reduce((acc, row) => ((row.total as number) > (acc.total as number) ? row : acc))
      : null;
  const savings = best && highest ? round2((highest.total as number) - (best.total as number)) : 0;
  const savingsPercent =
    best && highest && (highest.total as number) > 0 ? (savings / (highest.total as number)) * 100 : 0;

  // Economia por natureza: compara, em cada item, o maior e o menor valor cotado.
  const savingsByNature: NatureTotals = { material: 0, mao_de_obra: 0, outros: 0 };
  for (const item of draft.items) {
    const values = draft.suppliers
      .map((supplier) => itemTotal(item, supplier.id))
      .filter((value): value is number => value !== null);
    if (values.length < 2) continue;
    const nature = item.nature ?? "outros";
    savingsByNature[nature] = round2(savingsByNature[nature] + (Math.max(...values) - Math.min(...values)));
  }

  return {
    rankings,
    best,
    highest,
    savings,
    savingsPercent,
    itemCount: draft.items.length,
    supplierCount: draft.suppliers.filter((supplier) => supplier.name.trim()).length,
    isComparable: priced.length > 1,
    bestByNature: best?.byNature ?? { material: 0, mao_de_obra: 0, outros: 0 },
    savingsByNature,
  };
}

export function lowestPriceForItem(item: QuoteItem, suppliers: Supplier[]): number | null {
  const values = suppliers
    .map((supplier) => item.prices?.[supplier.id])
    .filter((value): value is number => value !== null && value !== undefined && !Number.isNaN(value));
  if (values.length === 0) return null;
  return Math.min(...values);
}

export function buildNarrative(draft: Pick<QuotationDraft, "items" | "suppliers" | "kind" | "service" | "condominium">): QuotationAnalysis {
  const metrics = computeMetrics(draft);
  const best = metrics.best;

  if (!best) {
    return {
      summary:
        "Mapa em elaboração. Insira as propostas dos fornecedores para gerar automaticamente o comparativo de preços.",
      recommendation:
        "Preencha os valores unitários de cada fornecedor e clique em “Gerar análise” para receber a recomendação técnica com o comparativo de economia.",
      notes: "",
    };
  }

  const bestName = best.supplier.name || "Fornecedor";
  const covered = best.coverage;
  const totalItems = metrics.itemCount;

  const { material, mao_de_obra: labor } = metrics.bestByNature;
  const composition =
    material > 0 && labor > 0
      ? `A composição da proposta recomendada é de ${formatCurrency(material)} em material e ${formatCurrency(labor)} em mão de obra (${Math.round((material / (material + labor)) * 100)}% material e ${Math.round((labor / (material + labor)) * 100)}% mão de obra).`
      : material > 0
        ? `A proposta recomendada é composta integralmente por material (${formatCurrency(material)}).`
        : labor > 0
          ? `A proposta recomendada é composta integralmente por mão de obra (${formatCurrency(labor)}).`
          : "";

  const summary = [
    `Foram analisadas ${metrics.supplierCount} proposta(s) para ${draft.kind === "produtos" ? "o fornecimento dos produtos" : "a prestação dos serviços"}${draft.service ? ` de ${draft.service.toLowerCase()}` : ""}, totalizando ${totalItems} item(ns) no escopo.`,
    metrics.isComparable
      ? `A proposta de ${bestName} apresenta o menor valor global (${formatCurrency(best.total)}), com cobertura de ${covered} de ${totalItems} item(ns) cotados.`
      : `A proposta de ${bestName} é a única com valores informados até o momento (${formatCurrency(best.total)}).`,
    composition,
    metrics.savings > 0
      ? `A diferença em relação à proposta mais elevada é de ${formatCurrency(metrics.savings)} (${metrics.savingsPercent.toFixed(1)}%), valor que representa a economia potencial na contratação.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const recommendation = best
    ? `Recomendamos a contratação de ${bestName}, condicionada à confirmação do escopo descrito, ao cumprimento integral das condições comerciais registradas e à apresentação da documentação fiscal e trabalhista exigida pela convenção do condomínio.`
    : "Aguardando definição do fornecedor recomendado.";

  return { summary, recommendation, notes: draft.condominium ? `Mapa elaborado para ${draft.condominium}.` : "" };
}

export function createSupplier(index: number): Supplier {
  return {
    id: uid("sup_"),
    name: index === 0 ? "Fornecedor A" : `Fornecedor ${String.fromCharCode(65 + index)}`,
    contact: "",
    deliveryDays: "",
    paymentTerms: "",
    validity: "",
    notes: "",
  };
}

export function createItem(description = "", supplierIds: string[] = []): QuoteItem {
  const prices: Record<string, number | null> = {};
  for (const id of supplierIds) prices[id] = null;
  return {
    id: uid("itm_"),
    description,
    unit: "un",
    quantity: 1,
    nature: description ? inferNature(description, "un") : "material",
    prices,
  };
}

export function createEmptyDraft(overrides: Partial<QuotationDraft> = {}): QuotationDraft {
  const suppliers = [createSupplier(0), createSupplier(1), createSupplier(2)];
  const items = [createItem("", suppliers.map((supplier) => supplier.id))];
  return {
    status: "em_analise",
    condominium: "",
    analysisDate: todayISO(),
    recipient: "Síndico(a) e Conselho Consultivo",
    service: "",
    description: "",
    kind: "servico",
    category: CATEGORIES[0],
    suppliers,
    items,
    analysis: { summary: "", recommendation: "", notes: "" },
    attachments: [],
    ...overrides,
  };
}

const KIND_VALUES: QuotationKind[] = ["servico", "produtos"];
const STATUS_VALUES: QuotationStatus[] = ["rascunho", "em_analise", "concluido"];

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.slice(0, 4000);
  if (typeof value === "number") return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseCurrencyInput(value);
    if (parsed !== null) return parsed;
  }
  return fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDraft(input: unknown): QuotationDraft {
  const source = (input ?? {}) as Record<string, unknown>;
  const rawSuppliers = Array.isArray(source.suppliers) ? source.suppliers : [];
  const suppliers: Supplier[] = rawSuppliers.slice(0, MAX_SUPPLIERS).map((entry, index) => {
    const supplier = (entry ?? {}) as Record<string, unknown>;
    return {
      id: asString(supplier.id) || `sup_${index}_${uid()}`,
      name: asString(supplier.name, `Fornecedor ${String.fromCharCode(65 + index)}`).slice(0, 160),
      contact: asString(supplier.contact).slice(0, 200),
      deliveryDays: asString(supplier.deliveryDays).slice(0, 80),
      paymentTerms: asString(supplier.paymentTerms).slice(0, 160),
      validity: asString(supplier.validity).slice(0, 80),
      notes: asString(supplier.notes).slice(0, 400),
    };
  });
  const safeSuppliers = suppliers.length > 0 ? suppliers : [createSupplier(0), createSupplier(1), createSupplier(2)];

  const rawItems = Array.isArray(source.items) ? source.items : [];
  const items: QuoteItem[] = rawItems.slice(0, 200).map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const rawPrices = (item.prices ?? {}) as Record<string, unknown>;
    const prices: Record<string, number | null> = {};
    for (const supplier of safeSuppliers) {
      prices[supplier.id] = nullableNumber(rawPrices[supplier.id]);
    }
    const description = asString(item.description).slice(0, 600);
    const unit = asString(item.unit, "un").slice(0, 24);
    return {
      id: asString(item.id) || uid("itm_"),
      description,
      unit,
      quantity: Math.max(0, asNumber(item.quantity, 1)),
      nature: normalizeNature(item.nature, description, unit),
      prices,
    };
  });

  const analysisInput = (source.analysis ?? {}) as Record<string, unknown>;
  const rawStatus = asString(source.status);
  const rawKind = asString(source.kind);
  const rawDate = asString(source.analysisDate);
  const analysisDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayISO();

  const attachments = Array.isArray(source.attachments) ? source.attachments : [];

  return {
    status: STATUS_VALUES.includes(rawStatus as QuotationStatus) ? (rawStatus as QuotationStatus) : "em_analise",
    condominium: asString(source.condominium).slice(0, 200),
    analysisDate,
    recipient: asString(source.recipient).slice(0, 240),
    service: asString(source.service).slice(0, 240),
    description: asString(source.description).slice(0, 2000),
    kind: KIND_VALUES.includes(rawKind as QuotationKind) ? (rawKind as QuotationKind) : "servico",
    category: asString(source.category, CATEGORIES[0]).slice(0, 80),
    suppliers: safeSuppliers,
    items: items.length > 0 ? items : [createItem("", safeSuppliers.map((supplier) => supplier.id))],
    analysis: {
      summary: asString(analysisInput.summary).slice(0, 4000),
      recommendation: asString(analysisInput.recommendation).slice(0, 2000),
      notes: asString(analysisInput.notes).slice(0, 2000),
    },
    attachments: attachments.slice(0, 12).map((entry, index) => {
      const file = (entry ?? {}) as Record<string, unknown>;
      const sourceValue = asString(file.source, "manual");
      return {
        name: asString(file.name, `Anexo ${index + 1}`).slice(0, 200),
        size: Math.max(0, asNumber(file.size, 0)),
        type: asString(file.type, "application/pdf").slice(0, 80),
        source: (["ia", "manual"].includes(sourceValue) ? sourceValue : "manual") as "ia" | "manual",
        analyzedAt: asString(file.analyzedAt) || undefined,
      };
    }),
    ...(asString(source.protocol) ? { protocol: asString(source.protocol) } : {}),
  };
}

export function nextProtocol(count: number): string {
  const year = new Date().getFullYear();
  return `MC-${year}-${String(count + 1).padStart(4, "0")}`;
}
