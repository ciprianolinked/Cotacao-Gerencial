"use client";

import Link from "next/link";
import { ArrowLeftIcon, DownloadIcon, PrinterIcon } from "./icons";

export function PrintToolbar({ quotationId, protocol }: { quotationId: string; protocol: string }) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Link href={`/mapas/${quotationId}`} className="btn btn-ghost">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Voltar ao mapa
          </Link>
          <span className="hidden text-[11px] font-semibold text-slate-500 sm:inline">
            Documento {protocol} · formato A4
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/quotations/${quotationId}/pdf`} className="btn btn-brand">
            <DownloadIcon className="h-4 w-4" />
            Baixar PDF
          </a>
          <button type="button" onClick={() => window.print()} className="btn btn-ghost">
            <PrinterIcon className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
