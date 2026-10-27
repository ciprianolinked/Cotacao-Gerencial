const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

/**
 * Flash-Lite é o padrão porque, em testes com propostas reais, respondeu em
 * ~1 s (contra ~130 s do 3.8-flash) e extraiu itens e preços com mais precisão.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

/** Ordem de tentativa quando um modelo está sobrecarregado (503) ou sem cota (429). */
export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
];

// Modelos antigos ou lentos demais para esta tarefa são trocados pelo padrão.
const REPLACED_MODELS = /^gemini-(2\.5-flash|3\.8-flash)(?:-latest|-001)?$/i;

/** Mantém modelos personalizados, mas troca os desativados/inadequados pelo padrão. */
export function resolveGeminiModel(configuredModel?: string): string {
  const model = (configuredModel ?? "").trim().replace(/^models\//i, "");
  if (!model || REPLACED_MODELS.test(model)) {
    return DEFAULT_GEMINI_MODEL;
  }
  return model;
}

/** Lista de modelos a tentar, começando pelo configurado e sem repetições. */
export function buildModelChain(configuredModel?: string): string[] {
  const primary = resolveGeminiModel(configuredModel);
  return [primary, ...GEMINI_FALLBACK_MODELS.filter((model) => model !== primary)];
}

export type GeminiInputPart =
  | { type: "text"; text: string }
  | { type: "document" | "image"; data: string; mime_type: string };

type InteractionResponse = {
  status?: string;
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

type GoogleApiErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{ "@type"?: string; retryDelay?: string; reason?: string }>;
  };
};

/** Extrai o motivo real vindo do Google (ex.: modelo sobrecarregado) e o tempo sugerido de espera. */
function parseGoogleError(details: string): { status?: string; message?: string; retryDelayMs?: number } {
  try {
    const parsed = JSON.parse(details) as GoogleApiErrorBody;
    const err = parsed?.error;
    if (!err || typeof err !== "object") return {};
    let retryDelayMs: number | undefined;
    for (const item of err.details ?? []) {
      const match = /(\d+(?:\.\d+)?)s/.exec(typeof item?.retryDelay === "string" ? item.retryDelay : "");
      if (match) {
        retryDelayMs = Math.round(parseFloat(match[1]) * 1000);
        break;
      }
    }
    return {
      status: typeof err.status === "string" ? err.status : undefined,
      message: typeof err.message === "string" ? err.message : undefined,
      retryDelayMs,
    };
  } catch {
    return {};
  }
}

function friendlyGeminiError(status: number, details: string): string {
  const google = parseGoogleError(details);
  const googleInfo = `${google.status ?? ""} ${google.message ?? ""}`;
  if (status === 401 || (status === 400 && /api.?key.*not valid|api_key_invalid|api key invalid/i.test(details))) {
    return "A chave do Gemini não é válida. Copie a chave completa no Google AI Studio e confira em Configurar IA.";
  }
  if (status === 403) {
    return "O Google recusou o acesso (erro 403). Verifique se a chave está ativa, se a API Gemini está habilitada e se o projeto pode usar o modelo selecionado.";
  }
  if (status === 404) {
    return "O modelo Gemini configurado não está disponível para esta chave (erro 404). Confira o acesso ao gemini-3.8-flash no Google AI Studio e, se definiu GEMINI_MODEL na hospedagem, atualize ou remova essa variável e publique novamente.";
  }
  if (status === 429) {
    return "O Google informou limite de uso ou falta de cota para o modelo (erro 429). Confira a disponibilidade e os limites do projeto no Google AI Studio e tente novamente após a renovação da cota.";
  }
  if (status === 503 || /high demand|overloaded|UNAVAILABLE/i.test(googleInfo)) {
    return "Todos os modelos do Google estão sobrecarregados neste momento (erro 503). O aplicativo já tentou alternativas automaticamente. Aguarde alguns minutos e tente de novo — seus arquivos continuam selecionados.";
  }
  if (status === 500 || status === 502 || status === 504) {
    return `O Google devolveu um erro temporário (erro ${status}). Aguarde alguns minutos e tente novamente; se repetir várias vezes seguidas, confira a página de status do Google AI Studio.`;
  }
  if (status === 400) {
    return "O Google não conseguiu processar esta solicitação (erro 400). Confira se os PDFs e imagens estão válidos e tente novamente.";
  }
  return `Não foi possível concluir a solicitação ao Gemini (erro ${status}). Confira a configuração e tente novamente.`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Falhas temporárias do Google que valem uma nova tentativa automática.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
// A rota permite 300 s no total; a volta automática respeita esta margem de segurança.
const GEMINI_OVERALL_BUDGET_MS = 285_000;
const MAX_ATTEMPTS_PER_MODEL = 2;

/**
 * Usa a API Interactions do Google para texto, imagens, PDFs e JSON estruturado.
 * A chave é enviada apenas no cabeçalho da requisição feita pelo servidor.
 */
export async function createGeminiInteraction({
  model,
  apiKey,
  input,
  responseSchema,
  generationConfig,
  timeoutMs = 120_000,
}: {
  model: string;
  apiKey: string;
  input: GeminiInputPart[];
  responseSchema?: unknown;
  generationConfig?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<string> {
  const key = apiKey.trim();
  if (!key) throw new Error("Informe a chave do Gemini em Configurar IA.");

  const chain = buildModelChain(model);
  const overallStart = Date.now();
  const fileCount = input.filter((part) => part.type !== "text").length;
  let lastStatus = 0;
  let lastDetails = "";

  // Percorre os modelos: se um estiver sobrecarregado (503) ou sem cota (429),
  // tenta automaticamente o próximo, dentro do tempo disponível da requisição.
  for (let index = 0; index < chain.length; index++) {
    const currentModel = chain[index];
    const body: Record<string, unknown> = { model: currentModel, input, store: false };
    if (responseSchema) {
      body.response_format = { type: "text", mime_type: "application/json", schema: responseSchema };
    }
    if (generationConfig) body.generation_config = generationConfig;
    const payload = JSON.stringify(body);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const remaining = GEMINI_OVERALL_BUDGET_MS - (Date.now() - overallStart);
      const attemptTimeout = Math.min(timeoutMs, remaining);
      if (attemptTimeout < 15_000) {
        throw new Error(
          lastStatus
            ? friendlyGeminiError(lastStatus, lastDetails)
            : "O tempo disponível para a análise se esgotou. Tente com menos arquivos por vez (por exemplo, 1 PDF).",
        );
      }

      const attemptStart = Date.now();
      let response: Response;
      try {
        response = await fetch(GEMINI_INTERACTIONS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: payload,
          signal: AbortSignal.timeout(attemptTimeout),
        });
      } catch (error) {
        const waited = Math.round((Date.now() - attemptStart) / 1000);
        const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
        console.error(
          `[gemini] ${currentModel} tentativa ${attempt}: ${isTimeout ? "timeout" : "falha de rede"} após ${waited}s · ${fileCount} arquivo(s)`,
        );
        const left = GEMINI_OVERALL_BUDGET_MS - (Date.now() - overallStart);
        // Tempo esgotado em um modelo: vale tentar o próximo, que costuma ser mais rápido.
        if (index < chain.length - 1 && left > 40_000) break;
        if (!isTimeout && attempt < MAX_ATTEMPTS_PER_MODEL && left > 60_000) {
          await sleep(4000);
          continue;
        }
        throw new Error(
          isTimeout
            ? `O Google Gemini não respondeu a tempo (${waited}s). Tente novamente com menos arquivos por vez (por exemplo, 1 PDF).`
            : "Não foi possível conectar ao Google Gemini. Verifique a conexão e tente novamente.",
        );
      }

      if (response.ok) {
        console.log(
          `[gemini] ok em ${Math.round((Date.now() - attemptStart) / 1000)}s · modelo ${currentModel} · tentativa ${attempt} · ${fileCount} arquivo(s)`,
        );
        return parseInteractionText(await response.json().catch(() => null));
      }

      lastStatus = response.status;
      lastDetails = await response.text().catch(() => "");
      const google = parseGoogleError(lastDetails);
      console.error(
        `[gemini] ${currentModel} tentativa ${attempt}: http ${response.status}${google.status ? ` (${google.status})` : ""} · ${lastDetails.replace(/\s+/g, " ").slice(0, 160)}`,
      );

      const left = GEMINI_OVERALL_BUDGET_MS - (Date.now() - overallStart);
      if (!RETRYABLE_STATUS.has(response.status)) {
        // Erro definitivo (chave inválida, arquivo inválido): não adianta trocar de modelo.
        throw new Error(friendlyGeminiError(response.status, lastDetails));
      }
      // Sobrecarga ou cota: parte direto para o próximo modelo, que pode estar livre.
      if (index < chain.length - 1 && left > 40_000) break;
      if (attempt < MAX_ATTEMPTS_PER_MODEL && left > 60_000) {
        const delay = Math.min(google.retryDelayMs ?? 4000 * attempt, 12_000);
        console.log(`[gemini] nova tentativa em ${Math.round(delay / 1000)}s`);
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  throw new Error(
    lastStatus
      ? friendlyGeminiError(lastStatus, lastDetails)
      : "Não foi possível concluir a análise no Google Gemini. Tente novamente em alguns minutos.",
  );
}

/** Extrai o texto da resposta da API Interactions (campo direto ou etapas do modelo). */
function parseInteractionText(result: unknown): string {
  const data = (result ?? {}) as InteractionResponse;
  if (!data || typeof data !== "object") {
    throw new Error("O Google Gemini retornou uma resposta inválida. Tente novamente.");
  }
  if (data.status && data.status !== "completed") {
    throw new Error("O Google Gemini não concluiu a análise. Tente novamente ou envie arquivos menores.");
  }
  const text =
    data.output_text ||
    (data.steps ?? [])
      .filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  if (!text?.trim()) {
    throw new Error("O Google Gemini não retornou uma resposta de texto. Tente novamente.");
  }
  return text;
}
