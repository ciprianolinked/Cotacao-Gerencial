"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error boundary]", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-[560px] flex-col items-center px-4 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="font-display mt-4 text-[24px] leading-tight text-ink">
        Algo inesperado aconteceu
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
        A plataforma encontrou um problema ao carregar esta página. Se você
        acabou de fazer o deploy, verifique a variável{" "}
        <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink">
          DATABASE_URL
        </code>{" "}
        nas configurações do projeto Vercel.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="btn btn-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link href="/" className="btn btn-ghost">
          Voltar ao painel
        </Link>
      </div>
    </main>
  );
}
