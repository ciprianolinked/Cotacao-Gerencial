import { AlertTriangle, Database } from "lucide-react";

interface DbErrorBannerProps {
  message: string;
}

export function DbErrorBanner({ message }: DbErrorBannerProps) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6">
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-amber-950 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-200/80 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 text-[12px] leading-relaxed">
            <p className="font-extrabold text-amber-950">
              Conexão com o banco de dados PostgreSQL pendente
            </p>
            <p className="mt-0.5 text-amber-900">{message}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-amber-800">
              <Database className="h-3.5 w-3.5 shrink-0" />
              <span>
                Na Vercel: acesse <strong>Settings → Environment Variables</strong>,
                cadastre <code className="rounded bg-white/80 px-1 font-mono font-bold">DATABASE_URL</code>{" "}
                (ou conecte Neon / Supabase / Vercel Postgres) e clique em{" "}
                <strong>Redeploy</strong>. Teste em{" "}
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline"
                >
                  /api/health
                </a>
                .
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
