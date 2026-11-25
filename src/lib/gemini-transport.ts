export const MODEL_CANDIDATES = [
  "gemini-4-hydrogen",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
] as const;

export interface GeminiAttempt {
  model: string;
  ok: boolean;
  detail?: string;
  durationMs: number;
}

export interface GeminiCallResult {
  json: Record<string, unknown>;
  modelUsed: string;
  attempts: GeminiAttempt[];
}

export class GeminiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public attempts: GeminiAttempt[] = []
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export interface GeminiCallOptions {
  /** Absolute, shared deadline; extra models cannot extend it. */
  deadlineMs?: number;
  totalTimeoutMs?: number;
  attemptTimeoutMs?: number;
}

export function extractTextFromGemini(json: Record<string, unknown>): string {
  const candidates = json.candidates as Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  }> | undefined;
  return (candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text).join("\n").trim();
}

/** Each candidate is tried once, so a failing primary cannot monopolize the budget. */
export async function callGeminiWithFallback(
  apiKey: string,
  preferredModel: string,
  body: Record<string, unknown>,
  options: GeminiCallOptions = {}
): Promise<GeminiCallResult> {
  const deadline = Math.min(
    options.deadlineMs ?? Infinity,
    Date.now() + (options.totalTimeoutMs ?? 40_000)
  );
  const ordered = [...new Set([preferredModel, ...MODEL_CANDIDATES].filter(Boolean))];
  const attempts: GeminiAttempt[] = [];
  let lastReason = "GEMINI_UNAVAILABLE";

  for (const model of ordered) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const timeout = Math.max(1, Math.min(options.attemptTimeoutMs ?? 12_000, remaining));
    const started = Date.now();
    const recordFailure = (detail: string) => {
      attempts.push({ model, ok: false, detail, durationMs: Date.now() - started });
    };

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeout),
          cache: "no-store",
        }
      );
      // The timer also covers receiving the body, not just response headers.
      const text = await response.text();
      let payload: Record<string, unknown> | null = null;
      try {
        const parsed: unknown = JSON.parse(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          payload = parsed as Record<string, unknown>;
        }
      } catch { /* gateways sometimes return HTML/plain text */ }

      if (!response.ok) {
        recordFailure(`HTTP ${response.status}`);
        const upstream = payload?.error as {
          message?: string;
          status?: string;
          details?: Array<{ reason?: string }>;
        } | undefined;
        const message = upstream?.message || "";
        const keyRejected = response.status === 401 ||
          upstream?.details?.some((item) => /API_KEY_INVALID|API_KEY_EXPIRED/.test(item.reason || "")) ||
          ((response.status === 400 || response.status === 403) &&
            /api.?key.*(?:not valid|invalid|expired|blocked|leaked)|(?:invalid|expired|blocked).*api.?key|unauthenticated/i.test(message));
        if (keyRejected) {
          throw new GeminiError("GEMINI_INVALID_KEY", "O Google recusou esta chave. Confira a chave no Google AI Studio; nenhuma troca de modelo corrige uma credencial inválida.", 400, attempts);
        }
        if (response.status === 413) {
          throw new GeminiError("GEMINI_PAYLOAD_TOO_LARGE", "O Google recusou o tamanho dos anexos. Reduza o envio e tente novamente.", 413, attempts);
        }
        // 404/403 can apply to one model only. 429 and 5xx also move on immediately.
        lastReason = response.status === 429 ? "GEMINI_RATE_LIMIT" :
          response.status === 404 ? "GEMINI_MODEL_UNAVAILABLE" :
          response.status === 403 ? "GEMINI_PERMISSION" : "GEMINI_UNAVAILABLE";
        continue;
      }

      const feedback = payload?.promptFeedback as { blockReason?: string } | undefined;
      if (feedback?.blockReason) {
        recordFailure("blocked");
        throw new GeminiError("GEMINI_CONTENT_BLOCKED", "O Google não processou este conteúdo. Confira os documentos enviados e as políticas do provedor.", 422, attempts);
      }
      if (!payload || !extractTextFromGemini(payload)) {
        recordFailure("empty_or_invalid_response");
        lastReason = "GEMINI_INVALID_RESPONSE";
        continue;
      }
      attempts.push({ model, ok: true, durationMs: Date.now() - started });
      return { json: payload, modelUsed: model, attempts };
    } catch (error) {
      if (error instanceof GeminiError) throw error;
      const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
      recordFailure(timedOut ? "timeout" : "network_error");
      lastReason = timedOut ? "GEMINI_TIMEOUT" : "GEMINI_UNAVAILABLE";
    }
  }

  const tried = attempts.length ? ` Modelos tentados: ${[...new Set(attempts.map((a) => a.model))].join(", ")}.` : "";
  if (Date.now() >= deadline || lastReason === "GEMINI_TIMEOUT") {
    throw new GeminiError("GEMINI_TIMEOUT", `O Google demorou além do prazo desta operação. Tente novamente em instantes.${tried}`, 504, attempts);
  }
  if (lastReason === "GEMINI_RATE_LIMIT") {
    throw new GeminiError(lastReason, `A cota do Google foi atingida nos modelos tentados. Aguarde ou confira os limites do seu projeto.${tried}`, 429, attempts);
  }
  if (lastReason === "GEMINI_PERMISSION" || lastReason === "GEMINI_MODEL_UNAVAILABLE") {
    throw new GeminiError(lastReason, `Os modelos tentados não estão disponíveis para este projeto/chave. Confira o acesso no Google AI Studio.${tried}`, 503, attempts);
  }
  throw new GeminiError(lastReason, `O Google não devolveu uma resposta utilizável nesta tentativa. Tente novamente em instantes.${tried}`, 503, attempts);
}

export async function testGeminiConnection(
  apiKey: string,
  preferredModel: string,
  options: GeminiCallOptions = {}
): Promise<{ ok: true; model: string; message: string; attempts: GeminiAttempt[] }> {
  const result = await callGeminiWithFallback(apiKey, preferredModel, {
    contents: [{ parts: [{ text: "Responda apenas com a palavra OK." }] }],
    generationConfig: { maxOutputTokens: 128, temperature: 0 },
  }, { ...options, totalTimeoutMs: options.totalTimeoutMs ?? 22_000, attemptTimeoutMs: options.attemptTimeoutMs ?? 4_000 });
  const fallback = result.modelUsed !== preferredModel
    ? ` Alternância automática a partir de ${preferredModel}; ${result.attempts.length} tentativa(s).`
    : "";
  return {
    ok: true,
    model: result.modelUsed,
    message: `Conexão confirmada com ${result.modelUsed}.${fallback}`,
    attempts: result.attempts,
  };
}
