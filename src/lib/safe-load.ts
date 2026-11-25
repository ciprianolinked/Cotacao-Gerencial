/**
 * Execução preguiçosa e segura de consultas de página.
 *
 * Se o banco de dados não estiver configurado (p.ex. DATABASE_URL ausente na
 * Vercel) ou estiver temporariamente indisponível, a página renderiza um
 * estado amigável em vez de derrubar o deploy inteiro com um erro fatal.
 */
export async function safeLoad<T>(
  fn: () => Promise<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    return { data: await fn(), error: null };
  } catch (error) {
    console.error("[safeLoad] Falha ao carregar dados:", error);
    const message =
      error instanceof Error ? error.message : String(error);
    return { data: null, error: message };
  }
}
