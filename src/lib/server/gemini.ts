const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
// A leitura de várias propostas pode demorar mesmo quando os arquivos são pequenos.
// Deixamos margem para a função concluir e enviar a resposta antes dos 240 segundos.
export const GEMINI_ANALYSIS_TIMEOUT_MS = 210_000;

/** Mantém configurações personalizadas, mas substitui o modelo antigo indisponível. */
export function resolveGeminiModel(configuredModel?: string): string {
  const model = (configuredModel ?? "").trim().replace(/^models\//i, "");
  if (!model || /^gemini-2\.5-flash(?:-latest|-001)?$/i.test(model)) {
    return DEFAULT_GEMINI_MODEL;
  }
  return model;
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

function friendlyGeminiError(status: number, details: string): string {
  if (status === 401 || (status === 400 && /api.?key.*not valid|api_key_invalid|api key invalid/i.test(details))) {
    return "A chave do Gemini não é válida. Copie a chave completa no Google AI Studio e confira em Configurar IA.";
  }
  if (status === 403) {
    return "O Google recusou o acesso. Verifique se a chave está ativa, se a API Gemini está habilitada e se o projeto pode usar o modelo selecionado.";
  }
  if (status === 404) {
    return "O modelo Gemini configurado não está disponível para esta chave. Confira o acesso ao gemini-3.8-flash no Google AI Studio e, se definiu GEMINI_MODEL na hospedagem, atualize ou remova essa variável e publique novamente.";
  }
  if (status === 429) {
    return "O Google informou limite de uso ou falta de cota para o modelo. Confira a disponibilidade e os limites do projeto no Google AI Studio e tente novamente após a renovação da cota.";
  }
  if (status === 400) {
    return "O Google não conseguiu processar esta solicitação. Confira se os PDFs e imagens estão válidos e tente novamente.";
  }
  if (status >= 500) {
    return "O serviço do Google está instável agora. Aguarde alguns minutos e tente novamente.";
  }
  return `Não foi possível concluir a solicitação ao Gemini (erro ${status}). Confira a configuração e tente novamente.`;
}

/**
 * Usa a API Interactions do Google para texto, imagens, PDFs e JSON estruturado.
 * A chave é enviada apenas no cabeçalho da requisição feita pelo servidor.
 */
export async function createGeminiInteraction({
  model,
  apiKey,
  input,
  responseSchema,
  timeoutMs = GEMINI_ANALYSIS_TIMEOUT_MS,
  signal,
}: {
  model: string;
  apiKey: string;
  input: GeminiInputPart[];
  responseSchema?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const key = apiKey.trim();
  if (!key) throw new Error("Informe a chave do Gemini em Configurar IA.");

  const resolvedModel = resolveGeminiModel(model);
  const body: Record<string, unknown> = {
    model: resolvedModel,
    input,
    // Esta análise não precisa manter o histórico da interação no Google.
    store: false,
  };
  // Gemini 3 aceita "low" e o Google o recomenda para reduzir a latência.
  // Não se aplica a modelos personalizados de outras gerações.
  if (/^gemini-3(?:\.|-)/i.test(resolvedModel)) {
    body.generation_config = { thinking_level: "low" };
  }
  if (responseSchema) {
    body.response_format = {
      type: "text",
      mime_type: "application/json",
      schema: responseSchema,
    };
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const timeoutMessage =
    "O Gemini não respondeu dentro do tempo disponível. Os arquivos continuam selecionados; tente novamente. Se o problema persistir, confira o status e a cota do Google AI Studio.";

  let response: Response;
  try {
    response = await fetch(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: requestSignal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new Error("Análise cancelada. Os arquivos continuam selecionados.");
    }
    if (timeoutSignal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
      throw new Error(timeoutMessage);
    }
    throw new Error("Não foi possível conectar ao Google Gemini. Verifique a conexão e tente novamente.");
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(friendlyGeminiError(response.status, details));
  }

  let result: InteractionResponse;
  try {
    result = (await response.json()) as InteractionResponse;
  } catch {
    if (signal?.aborted) throw new Error("Análise cancelada. Os arquivos continuam selecionados.");
    if (timeoutSignal.aborted) throw new Error(timeoutMessage);
    throw new Error("O Google Gemini retornou uma resposta inválida. Tente novamente.");
  }

  if (result.status && result.status !== "completed") {
    throw new Error("O Google Gemini não concluiu a análise. Tente novamente ou envie arquivos menores.");
  }

  const text =
    result.output_text ||
    (result.steps ?? [])
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
