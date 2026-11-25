import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";

interface DbUnavailableProps {
  title?: string;
  reason?: string;
}

export function DbUnavailable({
  title = "Banco de dados não configurado",
  reason,
}: DbUnavailableProps) {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col items-center px-4 py-16 text-center">
      <div className="flex justify-center">
        <span
          className="inline-flex items-center rounded-lg bg-ink px-3 py-1.5 shadow-sm"
          role="img"
          aria-label="Gerencial — Governança Condominial"
        >
          <img
            src="/identidade/logo.png"
            alt=""
            style={{ height: 34 }}
            className="w-auto max-w-full"
            aria-hidden="true"
          />
        </span>
      </div>

      <div className="mt-6 grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-700">
        <Database className="h-6 w-6" />
      </div>

      <h1 className="font-display mt-3 text-[24px] leading-tight text-ink">
        {title}
      </h1>

      <p className="mt-2 max-w-[480px] text-[13px] leading-relaxed text-slate-600">
        {reason
          ? `Não foi possível carregar os dados da plataforma: ${reason}`
          : "A plataforma precisa de uma conexão com PostgreSQL para listar, editar e aprovar mapas de cotação."}
      </p>

      <ol className="mt-4 max-w-[500px] space-y-2 text-left text-[12px] leading-snug text-slate-600">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink text-[9px] font-extrabold text-brand">
            1
          </span>
          Configure a variável de ambiente{" "}
          <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink">
            DATABASE_URL
          </code>{" "}
          no seu projeto Vercel (ou no arquivo <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink">.env</code>, localmente).
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink text-[9px] font-extrabold text-brand">
            2
          </span>
          Aplique o schema com{" "}
          <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink">
            npx drizzle-kit push
          </code>{" "}
          e recarregue a página.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink text-[9px] font-extrabold text-brand">
            3
          </span>
          Opcionalmente, configure a chave gratuita{" "}
          <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink">
            GEMINI_API_KEY
          </code>{" "}
          para leitura automática de PDFs e fotos.
        </li>
      </ol>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link href="/configuracoes" className="btn btn-primary">
          Ir para Configurar IA
        </Link>
        <a
          href="https://vercel.com/docs/environment-variables"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          Saiba mais sobre variáveis de ambiente
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </main>
  );
}
