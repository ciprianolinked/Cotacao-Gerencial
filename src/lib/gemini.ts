import {
  detectTrustedStore,
  generateAutomaticAnalysis,
  parseDecimalBR,
  todayISO,
  uid,
} from "./calculations";
import {
  CATEGORIES,
  TRUSTED_STORES,
  type CostType,
  type ProductSearchResult,
  type QuotationData,
  type QuotationItem,
  type Supplier,
} from "./types";

/**
 * Ordem de preferência dos modelos Gemini.
 * 1º gemini-4-hydrogen — equilíbrio entre velocidade e inteligência (nov/2026)
 * 2º gemini-3.5-flash-lite — mais rápido e econômico (jul/2026, document parsing)
 * Demais: modelos atuais de fallback para quando houver lentidão ou erro 503.
 */
export const MODEL_CANDIDATES = [
  "gemini-4-hydrogen",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
] as const;

const REQUEST_TIMEOUT_MS = 55_000;
const MAX_ATTEMPTS_PER_MODEL = 2;

function buildEndpoint(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GeminiCallResult {
  json: Record<string, unknown>;
  modelUsed: string;
  attempts: { model: string; ok: boolean; detail?: string }[];
}

export async function callGeminiWithFallback(
  apiKey: string,
  preferredModel: string,
  body: Record<string, unknown>
): Promise<GeminiCallResult> {
  const ordered = [
    preferredModel,
    ...MODEL_CANDIDATES.filter((m) => m !== preferredModel),
  ];

  const attempts: GeminiCallResult["attempts"] = [];
  let lastError = "Não foi possível comunicar com o Google Gemini.";

  for (const model of ordered) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const res = await fetch(buildEndpoint(model, apiKey), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (res.ok) {
          const json = (await res.json()) as Record<string, unknown>;
          attempts.push({ model, ok: true });
          return { json, modelUsed: model, attempts };
        }

        const errData = (await res.json().catch(() => ({}))) as {
          error?: { message?: string; status?: string };
        };
        const msg = errData.error?.message || `HTTP ${res.status}`;
        lastError = `[${model}] ${msg}`;

        // Erros de chave/permissão: não adianta trocar de modelo
        if (
          (res.status === 400 || res.status === 401 || res.status === 403) &&
          /api key|permission|unauthenticated|invalid|expired/i.test(msg)
        ) {
          attempts.push({ model, ok: false, detail: `HTTP ${res.status}` });
          throw new Error(
            `Chave inválida ou sem permissão: ${msg}. Gere uma nova chave em aistudio.google.com/apikey.`
          );
        }

        // 429 (cota) ou 5xx (sobrecarga/lentidão): tenta de novo / próximo modelo
        if (res.status === 429 || res.status >= 500) {
          attempts.push({ model, ok: false, detail: `HTTP ${res.status}` });
          if (attempt < MAX_ATTEMPTS_PER_MODEL) {
            await sleep(1200);
            continue;
          }
          break; // próximo modelo
        }

        // Demais 4xx (payload inválido etc.): tenta próximo modelo
        attempts.push({ model, ok: false, detail: `HTTP ${res.status}` });
        break;
      } catch (err) {
        if (err instanceof Error && /Chave inválida/.test(err.message)) {
          throw err;
        }
        const isTimeout =
          err instanceof Error &&
          (err.name === "TimeoutError" || /timeout|aborted/i.test(err.message));
        const detail = isTimeout ? "timeout" : "rede indisponível";
        lastError = `[${model}] ${detail}`;
        attempts.push({ model, ok: false, detail });
        break; // próximo modelo
      }
    }
  }

  const usedFallbacks = attempts.length > 0;
  throw new Error(
    usedFallbacks
      ? `O Google não conseguiu concluir a análise em nenhum modelo disponível (503/instabilidade). Tentados: ${[
          ...new Set(attempts.map((a) => a.model)),
        ].join(", ")}. Seus arquivos continuam selecionados — tente novamente em instantes ou verifique a cota do Gemini.`
      : lastError
  );
}

function extractTextFromGemini(json: Record<string, unknown>): string {
  const candidates = json.candidates as
    | Array<{ content?: { parts?: Array<{ text?: string }> } }>
    | undefined;
  const parts = candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? "")
    .join("\n")
    .trim();
}

function parseJsonBlock<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

export async function testGeminiConnection(
  apiKey: string,
  preferredModel: string
): Promise<{ ok: boolean; model: string; message: string }> {
  const { modelUsed, attempts } = await callGeminiWithFallback(
    apiKey,
    preferredModel,
    {
      contents: [
        {
          parts: [{ text: "Responda apenas com a palavra OK." }],
        },
      ],
      generationConfig: { maxOutputTokens: 10 },
    }
  );

  const fallbackNote =
    modelUsed !== preferredModel
      ? ` (fallback automático a partir de ${preferredModel}; ${attempts.length} tentativa(s))`
      : "";

  return {
    ok: true,
    model: modelUsed,
    message: `Conexão confirmada com ${modelUsed}.${fallbackNote}`,
  };
}

export async function extractQuotationWithGemini(params: {
  apiKey: string;
  model: string;
  files: { name: string; mimeType: string; base64: string }[];
  pastedText?: string;
  context: {
    condominium?: string;
    analysisDate?: string;
    recipient?: string;
    service?: string;
    description?: string;
    kind?: "servico" | "produtos";
    category?: string;
  };
  searchProducts?: boolean;
}): Promise<{ draft: QuotationData; modelUsed: string; warnings: string[] }> {
  const prompt = `Você é um analista sênior de governança condominial da Gerencial.
Analise os documentos e/ou textos de propostas comerciais enviados abaixo e estruture um Mapa de Cotação padronizado em JSON puro (sem markdown).

Contexto informado pelo usuário:
- Condomínio / Associação: ${params.context.condominium || "(identificar nos documentos, se houver)"}
- Serviço / Objeto: ${params.context.service || "(identificar nos documentos)"}
- Natureza: ${params.context.kind || "servico"}
- Categoria: ${params.context.category || "Manutenção predial"}
- Descrição inicial: ${params.context.description || "(redigir resumo objetivo do escopo)"}

REGRAS RIGOROSAS:
1. Extraia até 5 fornecedores distintos. Para cada fornecedor preencha: name, contact, deliveryDays, paymentTerms, validity, notes, purchaseUrl (se aparecer link no documento).
2. Extraia os itens/serviços comparáveis. Para cada item:
   - description: descrição clara e técnica
   - quantity: número positivo (ex: 1, 2, 12)
   - unit: uma dentre ["un","serviço","mês","m²","m","kg","L","cx","hora","vb (verba)"]
   - costType: "mao_obra" | "material" | "nao_discriminado". NÃO presuma divisão entre mão de obra e material se a proposta apresentar apenas valor global: use "nao_discriminado".
   - unitPricesBySupplierIndex: objeto mapeando o índice do fornecedor ("0", "1", "2"...) para o valor UNITÁRIO numérico (ou null se o fornecedor não cotou o item). Se a proposta só informar valor total do item e quantidade > 1, divida pela quantidade para obter o unitário.
   - purchaseUrl, purchaseStore, purchasePrice (opcionais, se constar link/loja).
3. Retorne EXATAMENTE este JSON:
{
  "condominium": "string",
  "service": "string",
  "description": "string",
  "kind": "servico" | "produtos",
  "category": "uma das categorias válidas: ${CATEGORIES.join(", ")}",
  "suppliers": [
    {
      "name": "string",
      "contact": "string",
      "deliveryDays": "string",
      "paymentTerms": "string",
      "validity": "string",
      "notes": "string",
      "purchaseUrl": "string"
    }
  ],
  "items": [
    {
      "description": "string",
      "unit": "un",
      "quantity": 1,
      "costType": "nao_discriminado",
      "unitPricesBySupplierIndex": { "0": 100.5, "1": 120.0 },
      "purchaseUrl": "",
      "purchaseStore": "",
      "purchasePrice": null
    }
  ],
  "notes": "observações técnicas relevantes encontradas nas propostas"
}`;

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];

  if (params.pastedText?.trim()) {
    parts.push({
      text: `TEXTO DAS PROPOSTAS COLADO PELO USUÁRIO:\n${params.pastedText.trim()}`,
    });
  }

  for (const file of params.files) {
    parts.push({
      text: `Arquivo anexado: ${file.name}`,
    });
    parts.push({
      inline_data: {
        mime_type: file.mimeType || "application/pdf",
        data: file.base64,
      },
    });
  }

  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const { json, modelUsed } = await callGeminiWithFallback(
    params.apiKey,
    params.model,
    body
  );

  const rawText = extractTextFromGemini(json);
  const parsed = parseJsonBlock<{
    condominium?: string;
    service?: string;
    description?: string;
    kind?: "servico" | "produtos";
    category?: string;
    suppliers?: Array<{
      name?: string;
      contact?: string;
      deliveryDays?: string;
      paymentTerms?: string;
      validity?: string;
      notes?: string;
      purchaseUrl?: string;
    }>;
    items?: Array<{
      description?: string;
      unit?: string;
      quantity?: number;
      costType?: CostType;
      unitPricesBySupplierIndex?: Record<string, number | string | null>;
      purchaseUrl?: string;
      purchaseStore?: string;
      purchasePrice?: number | null;
    }>;
    notes?: string;
  }>(rawText);

  const warnings: string[] = [];
  if (modelUsed !== params.model) {
    warnings.push(
      `O modelo principal (${params.model}) estava instável e a leitura foi concluída por ${modelUsed}.`
    );
  }

  const suppliers: Supplier[] = (parsed.suppliers ?? [])
    .slice(0, 5)
    .map((s, idx) => {
      const storeCheck = detectTrustedStore(s.purchaseUrl);
      return {
        id: uid(`sup_${idx}`),
        name: s.name?.trim() || `Fornecedor ${String.fromCharCode(65 + idx)}`,
        contact: s.contact?.trim() || "",
        deliveryDays: s.deliveryDays?.trim() || "",
        paymentTerms: s.paymentTerms?.trim() || "",
        validity: s.validity?.trim() || "",
        notes: s.notes?.trim() || "",
        purchaseUrl: s.purchaseUrl?.trim() || undefined,
        purchaseStore: storeCheck.store || undefined,
        purchaseVerified: storeCheck.verified || undefined,
        purchaseSource: s.purchaseUrl?.trim() ? "documento" : undefined,
      };
    });

  if (suppliers.length === 0) {
    suppliers.push({
      id: uid("sup_0"),
      name: "Fornecedor A",
      contact: "",
      deliveryDays: "",
      paymentTerms: "",
      validity: "",
      notes: "",
    });
  }

  const items: QuotationItem[] = (parsed.items ?? []).map((it, idx) => {
    const prices: Record<string, number | null> = {};
    suppliers.forEach((sup, sIdx) => {
      const rawVal = it.unitPricesBySupplierIndex?.[String(sIdx)];
      if (typeof rawVal === "number" && Number.isFinite(rawVal)) {
        prices[sup.id] = Math.round(rawVal * 100) / 100;
      } else if (typeof rawVal === "string") {
        prices[sup.id] = parseDecimalBR(rawVal);
      } else {
        prices[sup.id] = null;
      }
    });
    const storeCheck = detectTrustedStore(it.purchaseUrl);
    const validCostType: CostType =
      it.costType === "mao_obra" ||
      it.costType === "material" ||
      it.costType === "nao_discriminado"
        ? it.costType
        : params.context.kind === "produtos"
        ? "material"
        : "nao_discriminado";

    return {
      id: uid(`itm_${idx}`),
      description: it.description?.trim() || `Item ${idx + 1}`,
      unit: it.unit?.trim() || (params.context.kind === "produtos" ? "un" : "serviço"),
      quantity:
        typeof it.quantity === "number" && Number.isFinite(it.quantity) && it.quantity > 0
          ? it.quantity
          : 1,
      prices,
      costType: validCostType,
      purchaseUrl: it.purchaseUrl?.trim() || undefined,
      purchaseStore: it.purchaseStore?.trim() || storeCheck.store || undefined,
      purchasePrice:
        typeof it.purchasePrice === "number" && Number.isFinite(it.purchasePrice)
          ? it.purchasePrice
          : null,
      purchaseVerified: storeCheck.verified || undefined,
      purchaseSource: it.purchaseUrl?.trim() ? "documento" : undefined,
    };
  });

  if (items.length === 0) {
    items.push({
      id: uid("itm_0"),
      description: parsed.service || params.context.service || "Item principal",
      unit: params.context.kind === "produtos" ? "un" : "serviço",
      quantity: 1,
      prices: Object.fromEntries(suppliers.map((s) => [s.id, null])),
      costType: params.context.kind === "produtos" ? "material" : "nao_discriminado",
    });
  }

  const now = new Date().toISOString();
  const validCategory = CATEGORIES.includes(
    (parsed.category ?? "") as (typeof CATEGORIES)[number]
  )
    ? parsed.category!
    : params.context.category || "Manutenção predial";

  const draft: QuotationData = {
    status: "em_analise",
    condominium: params.context.condominium?.trim() || parsed.condominium?.trim() || "",
    analysisDate: params.context.analysisDate || todayISO(),
    recipient: params.context.recipient?.trim() || "Síndico(a) e Conselho Consultivo",
    service: params.context.service?.trim() || parsed.service?.trim() || "Cotação de propostas",
    description: params.context.description?.trim() || parsed.description?.trim() || "",
    kind: params.context.kind || parsed.kind || "servico",
    category: validCategory,
    suppliers,
    items,
    analysis: {
      summary: "",
      recommendation: "",
      notes: parsed.notes?.trim() || "",
      outcome: {
        supplierId: "",
        referenceAmount: null,
        contractedAmount: null,
        confirmed: false,
      },
    },
    attachments: params.files.map((f) => ({
      name: f.name,
      size: Math.round((f.base64.length * 3) / 4),
      type: f.mimeType || "application/pdf",
      source: "ia",
      analyzedAt: now,
    })),
  };

  const auto = generateAutomaticAnalysis(draft);
  draft.analysis.summary = auto.summary;
  draft.analysis.recommendation = auto.recommendation;

  return { draft, modelUsed, warnings };
}

export async function searchProductsWithGemini(params: {
  apiKey: string;
  model: string;
  items: string[];
}): Promise<{ results: ProductSearchResult[]; warnings: string[] }> {
  const domainsList = TRUSTED_STORES.map((s) => s.domain).join(", ");
  const prompt = `Pesquise os seguintes produtos no Brasil dando prioridade a lojas confiáveis (${domainsList}):
${params.items.map((it, idx) => `${idx + 1}. ${it}`).join("\n")}

Retorne APENAS JSON puro no formato:
{
  "results": [
    {
      "query": "nome exato pesquisado",
      "title": "título do produto encontrado",
      "url": "https://...",
      "store": "nome da loja",
      "price": 199.90,
      "snippet": "breve observação sobre o produto/disponibilidade"
    }
  ]
}
Se não encontrar preço exato, use price: null. Nunca invente URLs falsas; use apenas links reais retornados pela busca.`;

  const warnings: string[] = [];
  let json: Record<string, unknown>;
  let modelUsed = params.model;
  try {
    const res = await callGeminiWithFallback(params.apiKey, params.model, {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1 },
    });
    json = res.json;
    modelUsed = res.modelUsed;
  } catch (err) {
    warnings.push(
      err instanceof Error
        ? err.message
        : "Busca com Google Search indisponível no momento."
    );
    return { results: [], warnings };
  }

  if (modelUsed !== params.model) {
    warnings.push(`Pesquisa concluída por ${modelUsed} (fallback automático).`);
  }

  const rawText = extractTextFromGemini(json);
  try {
    const parsed = parseJsonBlock<{
      results?: Array<{
        query?: string;
        title?: string;
        url?: string;
        store?: string;
        price?: number | string | null;
        snippet?: string;
      }>;
    }>(rawText);

    const results: ProductSearchResult[] = (parsed.results ?? [])
      .filter((r) => r.url && /^https?:\/\//i.test(r.url))
      .map((r) => {
        const check = detectTrustedStore(r.url);
        const price =
          typeof r.price === "number" && Number.isFinite(r.price)
            ? r.price
            : typeof r.price === "string"
            ? parseDecimalBR(r.price)
            : null;
        return {
          query: r.query || params.items[0] || "",
          title: r.title || r.query || "Produto encontrado",
          url: r.url!,
          store: r.store || check.store || "Loja online",
          price,
          verified: check.verified,
          snippet: r.snippet,
        };
      });

    if (results.length === 0) {
      warnings.push("Nenhum link direto de produto foi retornado para os termos informados.");
    }
    return { results, warnings };
  } catch {
    warnings.push("Não foi possível interpretar o retorno estruturado da pesquisa.");
    return { results: [], warnings };
  }
}
