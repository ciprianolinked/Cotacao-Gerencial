import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { CondominiumsManager, type CondominiumStats } from "@/components/CondominiumsManager";
import { listCondominiums, listQuotations } from "@/lib/server/quotations";
import { computeMetrics } from "@/lib/quotation";
import type { CondominiumRecord } from "@/lib/types";
import { ArrowLeftIcon, ArrowRightIcon, TrendIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Condomínios · Gerencial",
  description: "Cadastre e edite os condomínios e associações atendidos pela Gerencial.",
};

export default async function CondominiosPage() {
  let condominiums: CondominiumRecord[] = [];
  let stats: CondominiumStats[] = [];
  let dbError = false;

  try {
    condominiums = await listCondominiums();
    const records = await listQuotations();
    const map = new Map<string, CondominiumStats>();
    for (const record of records) {
      const name = record.condominium.trim();
      if (!name) continue;
      const current = map.get(name) ?? { name, quotations: 0, savings: 0, lastDate: null };
      current.quotations += 1;
      current.savings += computeMetrics(record).savings;
      if (!current.lastDate || record.analysisDate > current.lastDate) current.lastDate = record.analysisDate;
      map.set(name, current);
    }
    stats = [...map.values()];
  } catch {
    dbError = true;
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-ink">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Painel de cotações
        </Link>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[28px] leading-tight text-ink sm:text-[34px]">Condomínios</h1>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-slate-500">
              Cadastre, edite e acompanhe os condomínios e associações atendidos. Os nomes aqui aparecem como sugestão
              ao criar um mapa de cotação.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-ghost">
            <TrendIcon className="h-4 w-4" />
            Ver indicadores
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {dbError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
            Não foi possível carregar os condomínios agora. Recarregue a página em instantes.
          </div>
        ) : (
          <div className="mt-4">
            <CondominiumsManager initial={condominiums} stats={stats} />
          </div>
        )}
      </main>
    </AppShell>
  );
}
