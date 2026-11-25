/**
 * Leitura segura de respostas fetch para evitar
 * `Unexpected token 'A', "An error o"... is not valid JSON`
 * quando a Vercel ou proxy devolve texto/HTML em erro 500/502/504.
 */
export async function safeJson<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    const clean = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);

    if (res.status === 504 || /timeout/i.test(clean)) {
      throw new Error(
        "O servidor demorou mais que o permitido para responder (504). Tente novamente."
      );
    }
    throw new Error(
      `Erro no servidor (HTTP ${res.status}): ${clean || "resposta não JSON."}`
    );
  }
}
