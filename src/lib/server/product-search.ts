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

LOJAS PREFERENCIAIS: ${TRUSTED_STORES.map((store) => `${store.label} (${store.domain})`).join("; ")}.

REGRAS OBRIGATÓRIAS:
1. Devolva o endereço exato da página de produto que apareceu na pesquisa. Prefira as lojas preferenciais; outra loja conhecida só é aceita se você tiver certeza da URL.
2. Nunca invente, complete ou adivinhe um endereço. Sem página encontrada, use "found": false e "url": "".
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

  const prompt = buildPrompt(items, hint);
  const generateUrl = `${GENERATE_BASE}/${encodeURIComponent(model)}:generateContent`;
  const interactionsUrl = `${GENERATE_BASE.replace("/models", "")}/interactions`;
  const transports = [
    {
      name: "generateContent",
      url: generateUrl,
      body: () => JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
      }),
    },
    {
      name: "interactions",
      url: interactionsUrl,
      body: () => JSON.stringify({
        model,
        input: [{ type: "text", text: prompt }],
        tools: [{ type: "google_search" }],
        store: false,
      }),
    },
  ];

  let text = "";
  const warnings: string[] = [];
  let lastError = "";

  function extractText(data: unknown): string {
    if (!data || typeof data !== "object") return "";
    const generate = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const fromGenerate = (generate.candidates ?? [])
      .flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("\n");
    if (fromGenerate.trim()) return fromGenerate;
    const interaction = data as { output_text?: string; steps?: { type?: string; content?: { type?: string; text?: string }[] }[] };
    return (
      interaction.output_text ||
      (interaction.steps ?? [])
        .filter((step) => step.type === "model_output")
        .flatMap((step) => step.content ?? [])
        .map((part) => part.text ?? "")
        .join("\n")
    );
  }

  for (const transport of transports) {
    let response: Response | null = null;
    let transportError = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
      const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;
      try {
        response = await fetch(transport.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.trim() },
          body: transport.body(),
          signal: composed,
        });
      } catch (error) {
        transportError = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
          ? "A pesquisa online demorou mais que o esperado."
          : "Não foi possível conectar ao serviço de pesquisa.";
        if (attempt === 1) { await new Promise((resolve) => setTimeout(resolve, 1200)); continue; }
        break;
      }
      if (response.ok) break;
      const details = await response.text().catch(() => "");
      transportError = response.status === 429 || response.status >= 500
        ? "A pesquisa online está temporariamente indisponível no Google. Tente novamente em instantes."
        : `A pesquisa online retornou erro ${response.status}. ${details.slice(0, 160)}`;
      if (attempt === 1 && (response.status === 429 || response.status >= 500)) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        continue;
      }
      break;
    }

    if (response?.ok) {
      const data = await response.json().catch(() => null);
      text = extractText(data);
      if (text.trim()) break;
      transportError = "A pesquisa não retornou resultados. Tente descrever o produto com marca e modelo.";
    }
    lastError = transportError || "Falha na pesquisa online.";
    if (text.trim()) break;
    warnings.push(`Busca via ${transport.name}: ${lastError}`);
  }

  if (!text.trim()) {
    return { results: [], warnings: warnings.length ? warnings : [lastError || "Falha na pesquisa online."] };
  }

  let raw: RawSearchItem[];
  try {
    raw = parseJsonLoose(text);
  } catch {
    return { results: [], warnings: [...warnings, "A pesquisa online retornou um formato inesperado. Tente novamente."] };
  }

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
      rejected.add(link.store ?? link.host);
    }
    results.push({
      index,
      description: items[index],
      found: Boolean(link),
      store: link?.store ?? (typeof entry.store === "string" && entry.store.trim() ? entry.store.trim().slice(0, 80) : link?.host ?? null),
      productName: typeof entry.productName === "string" ? entry.productName.slice(0, 200) : "",
      price: price !== null && Number.isFinite(price) && price > 0 ? round2(price) : null,
      purchaseUrl: link?.url ?? "",
      trusted: Boolean(link?.trusted),
      note: !link
        ? "Nenhum link encontrado; descreva o item com mais detalhes ou informe o fornecedor."
        : !link.trusted
          ? "Loja fora da lista preferencial: confira o endereço e o vendedor antes de comprar."
          : typeof entry.note === "string" ? entry.note.slice(0, 300) : "",
    });
  }

  if (rejected.size > 0) {
    warnings.push(`Links de lojas fora da lista preferencial foram mantidos sem o selo de loja confiável: ${[...rejected].join(", ")}.`);
  }
  const missing = items.filter((_, index) => !results.some((result) => result.index === index && result.found));
  if (missing.length > 0) {
    warnings.push(`${missing.length} item(ns) sem link encontrado: ${missing.slice(0, 4).join("; ")}${missing.length > 4 ? "…" : ""}.`);
  }
  return { results, warnings };
}
