import {
  COST_TYPE_LABEL,
  TRUSTED_STORES,
  type CostType,
  type QuotationData,
  type QuotationItem,
  type Supplier,
} from "./types";

export function uid(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 9);
  const ts = Date.now().toString(36).slice(-5);
  return `${prefix}_${ts}${rand}`;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyCompact(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "R$ 0,00";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  }
  if (abs >= 10_000) {
    return `${sign}R$ ${(abs / 1_000).toFixed(1).replace(".", ",")} mil`;
  }
  return formatCurrency(value);
}

export function formatDecimalInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseDecimalBR(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9,.-]/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? round2(num) : null;
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateLongBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTimeBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeSlug(str: string, maxLen = 58): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
}

export function detectTrustedStore(url: string | undefined): {
  verified: boolean;
  store: string;
} {
  if (!url?.trim()) return { verified: false, store: "" };
  try {
    const u = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const match = TRUSTED_STORES.find(
      (s) => host === s.domain || host.endsWith(`.${s.domain}`)
    );
    if (match) return { verified: true, store: match.label };
    return { verified: false, store: "" };
  } catch {
    return { verified: false, store: "" };
  }
}

export function itemTotal(item: QuotationItem, supplierId: string): number | null {
  const unitPrice = item.prices?.[supplierId];
  if (unitPrice === null || unitPrice === undefined || !Number.isFinite(unitPrice)) {
    return null;
  }
  const qty = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
  return round2(unitPrice * qty);
}

export function lowestPriceForItem(
  item: QuotationItem,
  suppliers: Supplier[]
): number | null {
  let min: number | null = null;
  for (const sup of suppliers) {
    const price = item.prices?.[sup.id];
    if (price !== null && price !== undefined && Number.isFinite(price) && price > 0) {
      if (min === null || price < min) min = price;
    }
  }
  return min;
}

export interface CostBreakdownBucket {
  total: number | null;
  count: number;
}

export function supplierCostBreakdown(
  items: QuotationItem[],
  supplierId: string
): Record<CostType, CostBreakdownBucket> {
  const result: Record<CostType, { sum: number; count: number }> = {
    mao_obra: { sum: 0, count: 0 },
    material: { sum: 0, count: 0 },
    nao_discriminado: { sum: 0, count: 0 },
  };
  for (const item of items) {
    const tot = itemTotal(item, supplierId);
    if (tot !== null) {
      const bucket = item.costType ?? "nao_discriminado";
      result[bucket].sum += tot;
      result[bucket].count += 1;
    }
  }
  return {
    mao_obra: {
      total: result.mao_obra.count > 0 ? round2(result.mao_obra.sum) : null,
      count: result.mao_obra.count,
    },
    material: {
      total: result.material.count > 0 ? round2(result.material.sum) : null,
      count: result.material.count,
    },
    nao_discriminado: {
      total:
        result.nao_discriminado.count > 0
          ? round2(result.nao_discriminado.sum)
          : null,
      count: result.nao_discriminado.count,
    },
  };
}

export interface SupplierRanking {
  supplier: Supplier;
  total: number | null;
  coverage: number;
  isComplete: boolean;
  isBest: boolean;
  breakdown: Record<CostType, CostBreakdownBucket>;
}

export interface QuotationSummary {
  supplierCount: number;
  pricedSupplierCount: number;
  itemCount: number;
  rankings: SupplierRanking[];
  completeRankings: SupplierRanking[];
  best: SupplierRanking | null;
  highest: SupplierRanking | null;
  savings: number;
  savingsPercent: number;
  isComparable: boolean;
}

export function computeSummary(data: QuotationData): QuotationSummary {
  const activeItems = data.items.filter(
    (it) =>
      it.description.trim().length > 0 ||
      Object.values(it.prices ?? {}).some((v) => v !== null && Number.isFinite(v))
  );
  const items = activeItems.length > 0 ? activeItems : data.items;
  const itemCount = items.length;

  const rankings: SupplierRanking[] = data.suppliers.map((supplier) => {
    let sum = 0;
    let coverage = 0;
    for (const item of items) {
      const tot = itemTotal(item, supplier.id);
      if (tot !== null) {
        sum += tot;
        coverage += 1;
      }
    }
    const total = coverage > 0 ? round2(sum) : null;
    const isComplete = itemCount > 0 && coverage === itemCount && total !== null;
    return {
      supplier,
      total,
      coverage,
      isComplete,
      isBest: false,
      breakdown: supplierCostBreakdown(items, supplier.id),
    };
  });

  const completeRankings = rankings
    .filter((r) => r.isComplete && r.total !== null)
    .sort((a, b) => (a.total ?? 0) - (b.total ?? 0));

  const best =
    completeRankings[0] ??
    rankings
      .filter((r) => r.total !== null)
      .sort((a, b) => (a.total ?? 0) - (b.total ?? 0))[0] ??
    null;

  if (best) {
    best.isBest = true;
  }

  const highest =
    completeRankings.length >= 2
      ? completeRankings[completeRankings.length - 1]
      : null;

  const isComparable = completeRankings.length >= 2;
  const savings =
    isComparable && best && best.total !== null && highest && highest.total !== null
      ? round2(Math.max(0, highest.total - best.total))
      : 0;
  const savingsPercent =
    isComparable && highest?.total && highest.total > 0
      ? round2((savings / highest.total) * 100)
      : 0;

  return {
    supplierCount: data.suppliers.filter((s) => s.name.trim().length > 0).length || data.suppliers.length,
    pricedSupplierCount: rankings.filter((r) => r.total !== null).length,
    itemCount,
    rankings,
    completeRankings,
    best,
    highest,
    savings,
    savingsPercent,
    isComparable,
  };
}

export function recordedSavings(data: QuotationData): number | null {
  const outcome = data.analysis?.outcome;
  if (
    data.status !== "concluido" ||
    !outcome?.confirmed ||
    !outcome.supplierId ||
    !data.suppliers.some((s) => s.id === outcome.supplierId) ||
    outcome.referenceAmount === null ||
    outcome.contractedAmount === null ||
    !Number.isFinite(outcome.referenceAmount) ||
    !Number.isFinite(outcome.contractedAmount) ||
    outcome.referenceAmount < 0 ||
    outcome.contractedAmount < 0
  ) {
    return null;
  }
  return round2(outcome.referenceAmount - outcome.contractedAmount);
}

export function generateAutomaticAnalysis(data: QuotationData): {
  summary: string;
  recommendation: string;
} {
  const summary = computeSummary(data);
  const serviceLabel = (data.service || "o objeto cotado").toLowerCase();
  const kindPrefix =
    data.kind === "produtos" ? "o fornecimento dos produtos de" : "a contratação de";

  if (!summary.best || summary.best.total === null) {
    return {
      summary: `Foram registradas ${summary.supplierCount} proposta(s) para ${kindPrefix} ${serviceLabel}, totalizando ${summary.itemCount} item(ns) no escopo. Aguardando o preenchimento completo dos valores unitários para consolidação do comparativo.`,
      recommendation:
        "Complete os valores unitários das propostas para que a recomendação técnica seja elaborada com base no comparativo global.",
    };
  }

  const bestName = summary.best.supplier.name.trim() || "Fornecedor selecionado";
  const parts: string[] = [];
  parts.push(
    `Foram analisadas ${summary.pricedSupplierCount} proposta(s) para ${kindPrefix} ${serviceLabel}, totalizando ${summary.itemCount} item(ns) no escopo.`
  );
  parts.push(
    `A proposta de ${bestName} apresenta o menor valor global (${formatCurrency(summary.best.total)}), com cobertura de ${summary.best.coverage} de ${summary.itemCount} item(ns) cotados.`
  );

  const bd = summary.best.breakdown;
  const bdParts: string[] = [];
  if (bd.mao_obra.total !== null) {
    bdParts.push(`mão de obra ${formatCurrency(bd.mao_obra.total)}`);
  }
  if (bd.material.total !== null) {
    bdParts.push(`material ${formatCurrency(bd.material.total)}`);
  }
  if (bd.nao_discriminado.total !== null) {
    bdParts.push(`não discriminado ${formatCurrency(bd.nao_discriminado.total)}`);
  }
  if (bdParts.length > 0) {
    parts.push(
      `Na proposta de ${bestName}, os itens informados somam: ${bdParts.join(", ")}. Valores não discriminados não foram divididos entre mão de obra e material.`
    );
  }

  if (summary.isComparable && summary.savings > 0) {
    parts.push(
      `A diferença em relação à proposta mais elevada é de ${formatCurrency(summary.savings)} (${summary.savingsPercent.toFixed(1)}%), valor que representa a economia potencial na contratação.`
    );
  } else if (!summary.isComparable) {
    parts.push(
      "Para apuração da economia potencial comparável, recomenda-se reunir ao menos duas propostas com cobertura completa de todos os itens."
    );
  }

  const recommendation = `Recomendamos avaliar a proposta de ${bestName}, condicionada à confirmação do escopo, das condições comerciais e da documentação exigida. A decisão deve ser validada pelo condomínio.`;

  return {
    summary: parts.join(" "),
    recommendation,
  };
}

export function createBlankQuotation(partial?: Partial<QuotationData>): QuotationData {
  const s1 = uid("sup_0");
  const s2 = uid("sup_1");
  const s3 = uid("sup_2");
  const i1 = uid("itm_0");

  return {
    status: partial?.status ?? "rascunho",
    condominium: partial?.condominium ?? "",
    analysisDate: partial?.analysisDate ?? todayISO(),
    recipient: partial?.recipient ?? "Síndico(a) e Conselho Consultivo",
    service: partial?.service ?? "",
    description: partial?.description ?? "",
    kind: partial?.kind ?? "servico",
    category: partial?.category ?? "Manutenção predial",
    suppliers: partial?.suppliers ?? [
      {
        id: s1,
        name: "Fornecedor A",
        contact: "",
        deliveryDays: "",
        paymentTerms: "",
        validity: "",
        notes: "",
      },
      {
        id: s2,
        name: "Fornecedor B",
        contact: "",
        deliveryDays: "",
        paymentTerms: "",
        validity: "",
        notes: "",
      },
      {
        id: s3,
        name: "Fornecedor C",
        contact: "",
        deliveryDays: "",
        paymentTerms: "",
        validity: "",
        notes: "",
      },
    ],
    items: partial?.items ?? [
      {
        id: i1,
        description: "",
        unit: partial?.kind === "produtos" ? "un" : "serviço",
        quantity: 1,
        prices: { [s1]: null, [s2]: null, [s3]: null },
        costType: partial?.kind === "produtos" ? "material" : "nao_discriminado",
      },
    ],
    analysis: partial?.analysis ?? {
      summary: "",
      recommendation: "",
      notes: "",
      outcome: {
        supplierId: "",
        referenceAmount: null,
        contractedAmount: null,
        confirmed: false,
      },
    },
    attachments: partial?.attachments ?? [],
  };
}

/**
 * Offline text parser so users can paste quotation text even without AI configured.
 */
export function parseQuotationText(
  rawText: string,
  context: {
    condominium?: string;
    service?: string;
    kind?: "servico" | "produtos";
    category?: string;
    recipient?: string;
    analysisDate?: string;
    description?: string;
  }
): QuotationData {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const suppliers: Supplier[] = [];
  const items: QuotationItem[] = [];
  const supplierByName = new Map<string, Supplier>();

  const ensureSupplier = (name: string): Supplier => {
    const clean = name.trim() || `Fornecedor ${suppliers.length + 1}`;
    const key = normalizeText(clean);
    const existing = supplierByName.get(key);
    if (existing) return existing;
    const sup: Supplier = {
      id: uid(`sup_${suppliers.length}`),
      name: clean,
      contact: "",
      deliveryDays: "",
      paymentTerms: "",
      validity: "",
      notes: "",
    };
    suppliers.push(sup);
    supplierByName.set(key, sup);
    return sup;
  };

  // Detect simple "Fornecedor - R$ 1.234,56" or "Fornecedor: R$ 1.234,56" patterns
  const moneyRegex = /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|[0-9]+(?:[.,][0-9]{2})?)/i;
  let currentSupplier: Supplier | null = null;

  for (const line of lines) {
    const supplierHeaderMatch = line.match(
      /^(?:fornecedor|empresa|proposta|orçamento|orcamento)\s*(?:\d+|[a-e])?\s*[:\-–]\s*(.+)$/i
    );
    if (supplierHeaderMatch) {
      const rest = supplierHeaderMatch[1].trim();
      const moneyInHeader = rest.match(moneyRegex);
      if (moneyInHeader) {
        const namePart = rest.slice(0, moneyInHeader.index).replace(/[:\-–|]+$/, "").trim();
        const sup = ensureSupplier(namePart);
        const val = parseDecimalBR(moneyInHeader[1]);
        if (val !== null) {
          let mainItem = items[0];
          if (!mainItem) {
            mainItem = {
              id: uid("itm_0"),
              description: context.service?.trim() || "Escopo global da proposta",
              unit: context.kind === "produtos" ? "un" : "serviço",
              quantity: 1,
              prices: {},
              costType: context.kind === "produtos" ? "material" : "nao_discriminado",
            };
            items.push(mainItem);
          }
          mainItem.prices[sup.id] = val;
        }
        currentSupplier = sup;
      } else {
        currentSupplier = ensureSupplier(rest);
      }
      continue;
    }

    const moneyMatch = line.match(moneyRegex);
    if (moneyMatch) {
      const val = parseDecimalBR(moneyMatch[1]);
      const before = line.slice(0, moneyMatch.index).replace(/[:\-–|]+$/, "").trim();
      const after = line.slice((moneyMatch.index ?? 0) + moneyMatch[0].length).trim();

      if (currentSupplier && before.length > 0) {
        // Item line under current supplier
        const qtyMatch = before.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|un|pç|pc|m2|m²|m|kg|l|cx)?\s+(.+)$/i);
        const qty = qtyMatch ? parseDecimalBR(qtyMatch[1]) ?? 1 : 1;
        const desc = qtyMatch ? qtyMatch[2].trim() : before;
        const normDesc = normalizeText(desc);
        let item = items.find((it) => normalizeText(it.description) === normDesc);
        if (!item) {
          item = {
            id: uid(`itm_${items.length}`),
            description: desc,
            unit: context.kind === "produtos" ? "un" : "serviço",
            quantity: qty,
            prices: {},
            costType: context.kind === "produtos" ? "material" : "nao_discriminado",
          };
          items.push(item);
        }
        if (val !== null) {
          item.prices[currentSupplier.id] = val;
        }
      } else if (before.length > 0 && suppliers.length < 5) {
        // Treat "Nome da Empresa - R$ 500,00 (observação)" as supplier quote for main scope
        const sup = ensureSupplier(before);
        if (after) sup.notes = after.replace(/^[\-–(|]+/, "").replace(/[)]$/, "").trim();
        let mainItem = items[0];
        if (!mainItem) {
          mainItem = {
            id: uid("itm_0"),
            description: context.service?.trim() || "Escopo global da proposta",
            unit: context.kind === "produtos" ? "un" : "serviço",
            quantity: 1,
            prices: {},
            costType: context.kind === "produtos" ? "material" : "nao_discriminado",
          };
          items.push(mainItem);
        }
        if (val !== null) mainItem.prices[sup.id] = val;
      }
      continue;
    }

    // Metadata lines for currentSupplier
    if (currentSupplier) {
      const prazoMatch = line.match(/^(?:prazo|entrega|execu[çc][aã]o)\s*[:\-–]\s*(.+)$/i);
      if (prazoMatch) {
        currentSupplier.deliveryDays = prazoMatch[1].trim();
        continue;
      }
      const pagMatch = line.match(/^(?:pagamento|condi[çc][aã]o|forma de pagamento)\s*[:\-–]\s*(.+)$/i);
      if (pagMatch) {
        currentSupplier.paymentTerms = pagMatch[1].trim();
        continue;
      }
      const valMatch = line.match(/^validade\s*[:\-–]\s*(.+)$/i);
      if (valMatch) {
        currentSupplier.validity = valMatch[1].trim();
        continue;
      }
      const contMatch = line.match(/^(?:contato|telefone|whatsapp|e-?mail)\s*[:\-–]\s*(.+)$/i);
      if (contMatch) {
        currentSupplier.contact = contMatch[1].trim();
        continue;
      }
    }
  }

  if (suppliers.length === 0) {
    return createBlankQuotation({
      status: "em_analise",
      condominium: context.condominium ?? "",
      analysisDate: context.analysisDate ?? todayISO(),
      recipient: context.recipient ?? "Síndico(a) e Conselho Consultivo",
      service: context.service ?? "",
      description: context.description || rawText.slice(0, 600),
      kind: context.kind ?? "servico",
      category: context.category ?? "Manutenção predial",
    });
  }

  if (items.length === 0) {
    items.push({
      id: uid("itm_0"),
      description: context.service?.trim() || "Item principal",
      unit: context.kind === "produtos" ? "un" : "serviço",
      quantity: 1,
      prices: {},
      costType: context.kind === "produtos" ? "material" : "nao_discriminado",
    });
  }

  // Ensure every item has a key for every supplier
  for (const item of items) {
    for (const sup of suppliers) {
      if (!(sup.id in item.prices)) {
        item.prices[sup.id] = null;
      }
    }
  }

  const draft: QuotationData = {
    status: "em_analise",
    condominium: context.condominium ?? "",
    analysisDate: context.analysisDate ?? todayISO(),
    recipient: context.recipient ?? "Síndico(a) e Conselho Consultivo",
    service: context.service ?? "Cotação de propostas",
    description: context.description ?? "",
    kind: context.kind ?? "servico",
    category: context.category ?? "Manutenção predial",
    suppliers: suppliers.slice(0, 5),
    items,
    analysis: {
      summary: "",
      recommendation: "",
      notes: "",
      outcome: {
        supplierId: "",
        referenceAmount: null,
        contractedAmount: null,
        confirmed: false,
      },
    },
    attachments: [],
  };

  const auto = generateAutomaticAnalysis(draft);
  draft.analysis.summary = auto.summary;
  draft.analysis.recommendation = auto.recommendation;
  return draft;
}

/**
 * Complementary merge when extracting additional proposals inside an existing map.
 */
export function mergeComplementary(
  current: QuotationData,
  incoming: Partial<QuotationData>,
  files: { name: string; size: number; type: string }[] = [],
  source: "ia" | "manual" = "ia"
): QuotationData {
  const nextSuppliers = current.suppliers.map((s) => ({ ...s }));
  const incomingToCurrentSupId = new Map<string, string>();

  for (const incSup of incoming.suppliers ?? []) {
    if (!incSup.name?.trim()) continue;
    const norm = normalizeText(incSup.name);
    const existingIdx = nextSuppliers.findIndex(
      (s) => s.name.trim() && normalizeText(s.name) === norm
    );
    if (existingIdx >= 0) {
      const ex = nextSuppliers[existingIdx];
      nextSuppliers[existingIdx] = {
        ...ex,
        contact: ex.contact || incSup.contact || "",
        deliveryDays: ex.deliveryDays || incSup.deliveryDays || "",
        paymentTerms: ex.paymentTerms || incSup.paymentTerms || "",
        validity: ex.validity || incSup.validity || "",
        notes: ex.notes || incSup.notes || "",
        purchaseUrl: ex.purchaseUrl || incSup.purchaseUrl,
        purchaseStore: ex.purchaseStore || incSup.purchaseStore,
        purchaseVerified: ex.purchaseVerified ?? incSup.purchaseVerified,
      };
      incomingToCurrentSupId.set(incSup.id, ex.id);
    } else if (nextSuppliers.length < 5) {
      // Replace generic placeholder ("Fornecedor A/B/C") if empty and unpriced
      const emptyPlaceholderIdx = nextSuppliers.findIndex((s) => {
        const isDefaultName = /^fornecedor\s+[a-e]$/i.test(s.name.trim()) || !s.name.trim();
        const hasPrices = current.items.some((it) => it.prices[s.id] !== null && it.prices[s.id] !== undefined);
        return isDefaultName && !hasPrices;
      });
      const newId = uid(`sup_${nextSuppliers.length}`);
      const created: Supplier = {
        ...incSup,
        id: newId,
      };
      if (emptyPlaceholderIdx >= 0) {
        nextSuppliers[emptyPlaceholderIdx] = created;
      } else {
        nextSuppliers.push(created);
      }
      incomingToCurrentSupId.set(incSup.id, newId);
    }
  }

  const nextItems = current.items
    .filter(
      (it) =>
        it.description.trim().length > 0 ||
        Object.values(it.prices).some((v) => v !== null && v !== undefined)
    )
    .map((it) => ({ ...it, prices: { ...it.prices } }));

  for (const incItem of incoming.items ?? []) {
    if (!incItem.description?.trim()) continue;
    const norm = normalizeText(incItem.description);
    let target = nextItems.find((it) => normalizeText(it.description) === norm);
    if (!target) {
      target = {
        id: uid(`itm_${nextItems.length}`),
        description: incItem.description.trim(),
        unit: incItem.unit || "un",
        quantity: incItem.quantity > 0 ? incItem.quantity : 1,
        prices: {},
        costType: incItem.costType ?? "nao_discriminado",
        purchaseUrl: incItem.purchaseUrl,
        purchaseStore: incItem.purchaseStore,
        purchasePrice: incItem.purchasePrice ?? null,
        purchaseVerified: incItem.purchaseVerified,
        purchaseSource: incItem.purchaseSource,
      };
      nextItems.push(target);
    } else {
      if (!target.purchaseUrl && incItem.purchaseUrl) {
        target.purchaseUrl = incItem.purchaseUrl;
        target.purchaseStore = incItem.purchaseStore;
        target.purchasePrice = incItem.purchasePrice ?? null;
        target.purchaseVerified = incItem.purchaseVerified;
        target.purchaseSource = incItem.purchaseSource;
      }
    }
    for (const [incSupId, price] of Object.entries(incItem.prices ?? {})) {
      const mappedSupId = incomingToCurrentSupId.get(incSupId);
      if (mappedSupId && price !== null && price !== undefined && Number.isFinite(price)) {
        if (target.prices[mappedSupId] === null || target.prices[mappedSupId] === undefined) {
          target.prices[mappedSupId] = round2(price);
        }
      }
    }
  }

  const now = new Date().toISOString();
  const newAtts = files.map((f) => ({
    name: f.name,
    size: f.size,
    type: f.type || "application/pdf",
    source,
    analyzedAt: now,
  }));
  const mergedAttachments = [
    ...current.attachments.filter((a) => !newAtts.some((n) => n.name === a.name)),
    ...newAtts,
  ].slice(-24);

  const merged: QuotationData = {
    ...current,
    condominium: current.condominium || incoming.condominium || "",
    service: current.service || incoming.service || "",
    description: current.description || incoming.description || "",
    kind: current.kind || incoming.kind || "servico",
    category: current.category || incoming.category || "Manutenção predial",
    suppliers: nextSuppliers,
    items: nextItems.length > 0 ? nextItems : current.items,
    attachments: mergedAttachments,
    analysis: {
      ...current.analysis,
      notes: current.analysis.notes || incoming.analysis?.notes || "",
    },
  };

  const auto = generateAutomaticAnalysis(merged);
  merged.analysis.summary = incoming.analysis?.summary || auto.summary;
  merged.analysis.recommendation = incoming.analysis?.recommendation || auto.recommendation;

  return merged;
}

export { COST_TYPE_LABEL };
