import { TRUSTED_STORES, parsePurchaseUrl } from "@/lib/constants";
import { round2 } from "@/lib/quotation";
import type { ProductSearchResult } from "@/lib/types";

const GENERATE_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const SEARCH_TIMEOUT_MS = 90_000;

type RawSearchItem = {
  item?: number | string;
  description?: string;
  found?: boolean;
  store?: string;
  productName?: string;
  price?: number | string | null;
  url?: string;
  purchaseUrl?: string;
  note?: string;
};

export type ProductSearchOutput = {
  results: ProductSearchResult[];
  warnings: string[];
};

function buildPrompt(descriptions: string[], hint?: string): string {
  const list = descriptions.map((description, index) => `${index + 1}. ${description}`).join("\n");
  return `Você é analista de compras da Gerencial (governança condominial) e fará uma pesquisa de preços na internet.

Pesquise cada item abaixo em lojas confiáveis do Brasil e devolva o melhor resultado encontrado.

ITENS:
${list}

LOJAS PERMITIDAS (use somente estas): ${TRUSTED_STORES.map((store) => `${store.label} (${store.domain})`).join("; ")}.

REGRAS OBRIGATÓRIAS:
1. Só devolva uma URL que realmente tenha aparecido na pesquisa e pertença a um dos domínios permitidos.
2. Nunca invente, complete ou adivinhe um endereço. Sem resultado confiável, use "found": false e "url": "".
3. Preencha "item" com o número do item da lista acima.
4. "price" é o preço unitário em reais encontrado no anúncio (número, sem R$). Use null se não houver preço visível.
5. "productName" é a descrição curta do produto encontrado; "store" é o nome da loja.
6. Uma sugestão por item. Se o item for genérico (ex.: "material de manutenção"), marque found=false.
7. Responda APENAS com JSON: {"results":[{"item":1,"found":true,"store":"","productName":"","price":0,"url":"","note":""}]}
${hint ? `\nContexto do condomínio: ${hint}` : ""}`;
}

function parseJsonLoose(raw: string): RawSearchItem[] {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  const parsed: unknown = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed as RawSearchItem[];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { results?: unknown }).results)) {
    return (parsed as { results: RawSearchItem[] }).results;
  }
  throw new Error("A pesquisa não retornou a lista de produtos em formato válido.");
}

/**
 * Pesquisa preços/links com Google Search grounding no Gemini.
 * Somente links de domínios da lista confiável são aceitos; os demais são
 * descartados e informados ao usuário.
 */
export async function searchProductsOnline({
  descriptions,
  apiKey,
  model,
  hint,
  signal,
}: {
  descriptions: string[];
  apiKey: string;
  model: string;
  hint?: string;
  signal?: AbortSignal;
}): Promise<ProductSearchOutput> {
  const items = descriptions.map((description) => description.trim()).filter(Boolean).slice(0, 12);
  if (items.length === 0) {
    return { results: [], warnings: ["Nenhum item descrito para pesquisar."] };
  }

  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: buildPrompt(items, hint) }] }],
    tools: [{ google_search: {} }],
    generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
  });
  const url = `${GENERATE_BASE}/${encodeURIComponent(model)}:generateContent`;

  let response: Response | null = null;
  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
    const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.trim() },
        body,
        signal: composed,
      });
    } catch (error) {
      lastError = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "A pesquisa online demorou mais que o esperado."
        : "Não foi possível conectar ao serviço de pesquisa.";
      if (attempt === 1) { await new Promise((resolve) => setTimeout(resolve, 1500)); continue; }
      return { results: [], warnings: [lastError] };
    }
    if (response.ok) break;
    lastError = response.status === 429 || response.status >= 500
      ? "A pesquisa online está temporariamente indisponível no Google. Tente novamente em instantes."
      : `A pesquisa online retornou erro ${response.status}. Verifique a chave e a disponibilidade do Google Search no projeto.`;
    if (attempt === 1 && (response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    return { results: [], warnings: [lastError] };
  }
  if (!response?.ok) return { results: [], warnings: [lastError || "Falha na pesquisa online."] };

  const data = (await response.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = (data?.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n");

  if (!text.trim()) {
    return { results: [], warnings: ["A pesquisa online não retornou resultados."] };
  }

  let raw: RawSearchItem[];
  try {
    raw = parseJsonLoose(text);
  } catch {
    return { results: [], warnings: ["A pesquisa online retornou um formato inesperado. Tente novamente."] };
  }

  const warnings: string[] = [];
  const rejected = new Set<string>();
  const results: ProductSearchResult[] = [];
  for (const entry of raw) {
    const index = Number(entry.item) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= items.length) continue;
    const rawUrl = typeof entry.url === "string" ? entry.url : typeof entry.purchaseUrl === "string" ? entry.purchaseUrl : "";
    const link = parsePurchaseUrl(rawUrl);
    const price = typeof entry.price === "number" ? entry.price : typeof entry.price === "string" ? Number(entry.price.replace(/\./g, "").replace(",", ".")) : null;
    if (rawUrl && !link) {
      warnings.push(`O endereço sugerido para "${items[index]}" não é válido e foi descartado.`);
    } else if (link && !link.trusted) {
      rejected.add(link.host);
    }
    const trustedLink = link?.trusted ? link : null;
    results.push({
      index,
      description: items[index],
      found: Boolean(entry.found) && Boolean(trustedLink),
      store: trustedLink?.store ?? null,
      productName: typeof entry.productName === "string" ? entry.productName.slice(0, 200) : "",
      price: price !== null && Number.isFinite(price) && price > 0 ? round2(price) : null,
      purchaseUrl: trustedLink?.url ?? "",
      trusted: Boolean(trustedLink),
      note: !trustedLink
        ? "Sem link em loja confiável; confira o fornecedor."
        : typeof entry.note === "string" ? entry.note.slice(0, 300) : "",
    });
  }

  if (rejected.size > 0) {
    warnings.push(`Links de lojas fora da lista confiável foram descartados: ${[...rejected].join(", ")}.`);
  }
  const missing = items.filter((_, index) => !results.some((result) => result.index === index && result.found));
  if (missing.length > 0) {
    warnings.push(`${missing.length} item(ns) sem resultado confiável: ${missing.slice(0, 4).join("; ")}${missing.length > 4 ? "…" : ""}.`);
  }
  return { results, warnings };
}
