import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { PrintToolbar } from "@/components/PrintToolbar";
import { BrandLogo } from "@/components/BrandLogo";
import { listQuotations } from "@/lib/server/quotations";
import { computeMetrics, formatCompactCurrency, formatCurrency, formatDateBR, formatDateLong, todayISO } from "@/lib/quotation";
import { NATURE_LABEL, STATUS_LABEL } from "@/lib/constants";
import type { QuotationRecord } from "@/lib/types";
import { ArrowLeftIcon, BuildingIcon, CheckIcon, FileIcon, TrendIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Indicadores das cotações · Gerencial",
  description: "Painel de resultados das cotações para apresentação em assembleia.",
};

type Row = { name: string; quotations: number; savings: number; analyzed: number };

function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: "default" | "gold" | "green";
}) {
  const style =
    tone === "gold" ? "bg-brand-soft text-brand-dark" : tone === "green" ? "bg-success-soft text-success" : "bg-paper text-ink";
  return (
    <div className="card px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label !text-[8.5px]">{label}</p>
          <p className="font-display mt-1 text-[26px] leading-none text-ink">{value}</p>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style}`}>{icon}</span>
      </div>
      <p className="mt-2 text-[10.5px] leading-snug text-slate-500">{hint}</p>
    </div>
  );
}

function Bars({ rows, max }: { rows: Row[]; max: number }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.name}>
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="min-w-0 truncate font-semibold text-ink">{row.name}</span>
            <span className="shrink-0 font-extrabold tabular-nums text-success">{formatCurrency(row.savings)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${max > 0 ? Math.max(3, (row.savings / max) * 100) : 0}%` }}
              />
            </div>
            <span className="w-[86px] shrink-0 text-right text-[10.5px] text-slate-500">
              {row.quotations} mapa(s)
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  let records: QuotationRecord[] = [];
  let dbError = false;
  try {
    records = await listQuotations();
  } catch {
    dbError = true;
  }

  const analyzed = records.filter((record) => computeMetrics(record).isComparable);
  let totalSavings = 0;
  let totalBest = 0;
  let totalHighest = 0;
  const natureSavings = { material: 0, mao_de_obra: 0, outros: 0 };
  const byCondo = new Map<string, Row>();
  const byCategory = new Map<string, Row>();

  for (const record of records) {
    const metrics = computeMetrics(record);
    totalSavings += metrics.savings;
    totalBest += metrics.best?.total ?? 0;
    totalHighest += metrics.highest?.total ?? metrics.best?.total ?? 0;
    natureSavings.material += metrics.savingsByNature.material;
    natureSavings.mao_de_obra += metrics.savingsByNature.mao_de_obra;
    natureSavings.outros += metrics.savingsByNature.outros;

    const condoName = record.condominium.trim() || "Sem condomínio informado";
    const condo = byCondo.get(condoName) ?? { name: condoName, quotations: 0, savings: 0, analyzed: 0 };
    condo.quotations += 1;
    condo.savings += metrics.savings;
    if (metrics.isComparable) condo.analyzed += 1;
    byCondo.set(condoName, condo);

    const categoryName = record.category || "Outros";
    const category = byCategory.get(categoryName) ?? { name: categoryName, quotations: 0, savings: 0, analyzed: 0 };
    category.quotations += 1;
    category.savings += metrics.savings;
    byCategory.set(categoryName, category);
  }

  const condoRows = [...byCondo.values()].sort((a, b) => b.savings - a.savings);
  const categoryRows = [...byCategory.values()].sort((a, b) => b.savings - a.savings);
  const maxCondo = Math.max(...condoRows.map((row) => row.savings), 0);
  const maxCategory = Math.max(...categoryRows.map((row) => row.savings), 0);
  const averagePercent = totalHighest > 0 ? (totalSavings / totalHighest) * 100 : 0;
  const averagePerQuotation = analyzed.length > 0 ? totalSavings / analyzed.length : 0;
  const totalSuppliers = records.reduce((sum, record) => sum + computeMetrics(record).supplierCount, 0);
  const natureTotal = natureSavings.material + natureSavings.mao_de_obra + natureSavings.outros;

  const period = (() => {
    const dates = records.map((record) => record.analysisDate).filter(Boolean).sort();
    if (dates.length === 0) return formatDateLong(todayISO());
    return `${formatDateBR(dates[0])} a ${formatDateBR(dates[dates.length - 1])}`;
  })();

  return (
    <AppShell>
      <div className="no-print">
        <PrintToolbar backHref="/" backLabel="Painel de cotações" label="Indicadores para assembleia" />
      </div>

      <main className="print-page mx-auto max-w-[1200px] px-4 pb-16 pt-5 sm:px-6">
        <Link
          href="/"
          className="no-print inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-ink"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Painel de cotações
        </Link>

        <section className="mt-2 overflow-hidden rounded-2xl bg-ink text-white">
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-6 sm:px-8">
            <div>
              <BrandLogo size="sm" treatment="bare" />
              <h1 className="font-display mt-3 text-[26px] leading-tight sm:text-[34px]">
                Resultados das cotações
              </h1>
              <p className="mt-1 text-[12px] text-white/70">
                Economia obtida com o processo comparativo · período {period}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand">Economia total apurada</p>
              <p className="font-display text-[40px] leading-none text-brand">{formatCompactCurrency(totalSavings)}</p>
              <p className="mt-1 text-[11px] text-white/60">{formatCurrency(totalSavings)}</p>
            </div>
          </div>
          <div className="h-1.5 bg-brand" />
        </section>

        {dbError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
            Não foi possível carregar os indicadores agora. Recarregue a página em instantes.
          </div>
        )}

        {!dbError && records.length === 0 ? (
          <section className="card mt-4 px-6 py-12 text-center">
            <TrendIcon className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-3 text-[14px] font-bold text-ink">Ainda não há cotações para exibir</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Crie e salve seus mapas de cotação: os indicadores desta página são calculados automaticamente.
            </p>
            <Link href="/mapas/novo" className="btn btn-brand mt-4">
              Criar primeira cotação
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                label="Economia apurada"
                value={formatCompactCurrency(totalSavings)}
                hint="Diferença entre a melhor proposta e a mais cara em cada mapa"
                icon={<TrendIcon className="h-4 w-4" />}
                tone="green"
              />
              <Kpi
                label="Redução média"
                value={`${averagePercent.toFixed(1)}%`}
                hint="Percentual economizado sobre o total das propostas mais caras"
                icon={<CheckIcon className="h-4 w-4" />}
                tone="gold"
              />
              <Kpi
                label="Cotações realizadas"
                value={String(records.length)}
                hint={`${analyzed.length} com 2 ou mais propostas comparáveis`}
                icon={<FileIcon className="h-4 w-4" />}
              />
              <Kpi
                label="Condomínios atendidos"
                value={String(condoRows.length)}
                hint={`${totalSuppliers} fornecedor(es) consultado(s) no período`}
                icon={<BuildingIcon className="h-4 w-4" />}
              />
            </section>

            <section className="mt-3 grid gap-3 lg:grid-cols-3">
              <div className="card px-4 py-4">
                <p className="label !text-[8.5px]">Valor contratado (melhores propostas)</p>
                <p className="font-display mt-1 text-[22px] leading-none text-ink">{formatCurrency(totalBest)}</p>
                <p className="mt-1.5 text-[10.5px] text-slate-500">
                  Se tivessem sido aceitas as propostas mais caras: {formatCurrency(totalHighest)}
                </p>
              </div>
              <div className="card px-4 py-4">
                <p className="label !text-[8.5px]">Economia média por cotação</p>
                <p className="font-display mt-1 text-[22px] leading-none text-success">
                  {formatCurrency(averagePerQuotation)}
                </p>
                <p className="mt-1.5 text-[10.5px] text-slate-500">
                  Considera apenas mapas com duas ou mais propostas
                </p>
              </div>
              <div className="card px-4 py-4">
                <p className="label !text-[8.5px]">Economia por natureza</p>
                {natureTotal > 0 ? (
                  <>
                    <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-paper">
                      <div className="h-full bg-sky-500" style={{ width: `${(natureSavings.material / natureTotal) * 100}%` }} />
                      <div className="h-full bg-violet-500" style={{ width: `${(natureSavings.mao_de_obra / natureTotal) * 100}%` }} />
                      <div className="h-full bg-slate-400" style={{ width: `${(natureSavings.outros / natureTotal) * 100}%` }} />
                    </div>
                    <dl className="mt-2 space-y-1">
                      {([["material", "bg-sky-500"], ["mao_de_obra", "bg-violet-500"], ["outros", "bg-slate-400"]] as const).map(
                        ([nature, color]) => (
                          <div key={nature} className="flex items-center justify-between text-[11px]">
                            <dt className="flex items-center gap-1.5 text-slate-600">
                              <span className={`h-2 w-2 rounded-full ${color}`} />
                              {NATURE_LABEL[nature]}
                            </dt>
                            <dd className="font-bold tabular-nums text-ink">{formatCurrency(natureSavings[nature])}</dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </>
                ) : (
                  <p className="mt-2 text-[11px] leading-snug text-slate-500">
                    Classifique os itens entre material e mão de obra para ver esta divisão.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="card px-4 py-4 sm:px-5">
                <h2 className="text-[14px] font-extrabold text-ink">Economia por condomínio</h2>
                <p className="mt-0.5 text-[11.5px] text-slate-500">Do maior para o menor resultado no período.</p>
                <div className="mt-3">
                  <Bars rows={condoRows.slice(0, 8)} max={maxCondo} />
                </div>
              </div>
              <div className="card px-4 py-4 sm:px-5">
                <h2 className="text-[14px] font-extrabold text-ink">Economia por categoria</h2>
                <p className="mt-0.5 text-[11.5px] text-slate-500">Onde a negociação gerou mais resultado.</p>
                <div className="mt-3">
                  <Bars rows={categoryRows.slice(0, 8)} max={maxCategory} />
                </div>
              </div>
            </section>

            <section className="card mt-3 overflow-hidden">
              <div className="border-b border-line px-4 py-3 sm:px-5">
                <h2 className="text-[14px] font-extrabold text-ink">Detalhamento das cotações</h2>
                <p className="mt-0.5 text-[11.5px] text-slate-500">
                  Tabela para leitura em assembleia, com a economia de cada processo.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr>
                      {["Protocolo", "Condomínio", "Objeto", "Data", "Melhor proposta", "Economia", "Situação"].map((header) => (
                        <th
                          key={header}
                          className="border-b border-line bg-paper px-3 py-2 text-left text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-500"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => {
                      const metrics = computeMetrics(record);
                      return (
                        <tr key={record.id}>
                          <td className="border-b border-line px-3 py-2 font-mono text-[10.5px] text-slate-600">
                            {record.protocol}
                          </td>
                          <td className="border-b border-line px-3 py-2 font-semibold text-ink">
                            {record.condominium || "—"}
                          </td>
                          <td className="max-w-[240px] truncate border-b border-line px-3 py-2 text-slate-600">
                            {record.service || "—"}
                          </td>
                          <td className="whitespace-nowrap border-b border-line px-3 py-2 text-slate-600">
                            {formatDateBR(record.analysisDate)}
                          </td>
                          <td className="border-b border-line px-3 py-2">
                            <span className="block font-semibold text-ink">{metrics.best?.supplier.name ?? "—"}</span>
                            <span className="block text-[10.5px] text-slate-500">
                              {formatCurrency(metrics.best?.total ?? null)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap border-b border-line px-3 py-2 font-extrabold text-success">
                            {metrics.savings > 0 ? formatCurrency(metrics.savings) : "—"}
                          </td>
                          <td className="whitespace-nowrap border-b border-line px-3 py-2 text-slate-600">
                            {STATUS_LABEL[record.status]}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="bg-ink px-3 py-2 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                        Economia total do período
                      </td>
                      <td className="bg-ink px-3 py-2 text-[12px] font-extrabold text-brand">
                        {formatCurrency(totalSavings)}
                      </td>
                      <td className="bg-ink" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <p className="mt-4 text-[10px] leading-relaxed text-slate-400">
              Como é calculado: em cada mapa, a economia é a diferença entre a proposta mais cara e a proposta
              recomendada, considerando apenas processos com duas ou mais propostas com valores lançados. Documento
              gerado pela Gerencial · Governança Condominial em {formatDateLong(todayISO())}.
            </p>
          </>
        )}
      </main>
    </AppShell>
  );
}
