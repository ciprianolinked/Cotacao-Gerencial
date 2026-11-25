export class ApiRequestError extends Error {
  status: number;
  requestId?: string;
  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.requestId = requestId;
  }
}

/** Vercel gateways can return plain text or HTML, even for a JSON API. */
export async function readApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    // Never display a platform HTML page, a raw response or a JSON SyntaxError.
  }

  const requestId = typeof data?.requestId === "string"
    ? data.requestId
    : response.headers.get("x-vercel-id") || undefined;

  if (!response.ok || !data) {
    let message: string;
    if (typeof data?.error === "string" && data.error) {
      message = data.error;
    } else if (response.status === 504 || /FUNCTION_INVOCATION_TIMEOUT/i.test(text)) {
      message = "O servidor excedeu o tempo de resposta. Tente novamente; uma confirmação de salvamento anterior continua válida.";
    } else if (response.status === 413) {
      message = "O envio excede o tamanho permitido pelo servidor. Reduza o tamanho ou a quantidade de anexos.";
    } else if (response.status === 429) {
      message = "Muitas solicitações no momento. Aguarde alguns instantes antes de tentar novamente.";
    } else if (response.status === 401 || response.status === 403) {
      message = "O servidor recusou esta solicitação. Verifique o acesso ao deploy antes de tentar novamente.";
    } else if (response.status === 404) {
      message = "Esta operação não está disponível neste deploy. Atualize a publicação e recarregue a página.";
    } else {
      message = "O servidor devolveu uma resposta inválida. Não foi possível confirmar esta operação; tente novamente.";
    }
    throw new ApiRequestError(`${message} (HTTP ${response.status})`, response.status, requestId);
  }
  return data as T;
}

export async function fetchApiJson<T>(url: string, init: RequestInit = {}, timeoutMs = 65_000): Promise<T> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs),
    });
    return await readApiResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new ApiRequestError("A solicitação demorou além do limite. Não foi possível confirmar esta etapa; tente novamente.", 0);
    }
    throw new ApiRequestError("Não foi possível alcançar o servidor. Verifique sua conexão e tente novamente.", 0);
  }
}
