"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  TrendingDown,
  Users,
} from "lucide-react";
import {
  computeSummary,
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatSize,
  recordedSavings,
} from "@/lib/calculations";
import {
  STATUS_META,
  type PdfDownloadRecord,
  type QuotationRecord,
} from "@/lib/types";

interface IndicatorsClientProps {
  quotations: QuotationRecord[];
  initialDownloads: PdfDownloadRecord[];
}

const MONTH_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatMonthKey(ym: string): string {
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  if (!y || idx < 0 || idx > 11) return ym;
  return `${MONTH_PT[idx]}/${y.slice(-2)}`;
}

export function IndicatorsClient({
  quotations,
  initialDownloads,
}: IndicatorsClientProps) {
  const [condoFilter, setCondoFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloads, setDownloads] =
    useState<PdfDownloadRecord[]>(initialDownloads);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [refreshingDownloads, setRefreshingDownloads] = useState(false);

  const condoOptions = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => {
      if (q.condominium.trim()) set.add(q.condominium.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [quotations]);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      if (condoFilter && q.condominium !== condoFilter) return false;
      if (startDate && q.analysisDate < startDate) return false;
      if (endDate && q.analysisDate > endDate) return false;
      return true;
    });
  }, [quotations, condoFilter, startDate, endDate]);

  const metrics = useMemo(() => {
    let confirmedTotal = 0;
    let confirmedCount = 0;
    let potentialTotal = 0;
    let comparableCount = 0;
    let concludedCount = 0;
    let pricedProposals = 0;

    let maoObraTotal = 0;
    let materialTotal = 0;
    let naoDiscTotal = 0;

    const monthMap = new Map<
      string,
      { potential: number; confirmed: number }
    >();
    const condoMap = new Map<string, { count: number; potential: number }>();

    for (const q of filtered) {
      const s = computeSummary(q);
      const rec = recordedSavings(q);

      if (q.status === "concluido") concludedCount += 1;
      pricedProposals += s.pricedSupplierCount;

      if (s.isComparable) {
        potentialTotal += s.savings;
        comparableCount += 1;
      }
      if (rec !== null) {
        confirmedTotal += rec;
        confirmedCount += 1;
      }

      if (s.best && s.best.isComplete) {
        maoObraTotal += s.best.breakdown.mao_obra.total ?? 0;
        materialTotal += s.best.breakdown.material.total ?? 0;
        naoDiscTotal += s.best.breakdown.nao_discriminado.total ?? 0;
      }

      const ym = q.analysisDate.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) {
        const cur = monthMap.get(ym) ?? { potential: 0, confirmed: 0 };
        if (s.isComparable) cur.potential += s.savings;
        if (rec !== null) cur.confirmed += rec;
        monthMap.set(ym, cur);
      }

      const cKey = q.condominium || "Sem condomínio";
      const cCur = condoMap.get(cKey) ?? { count: 0, potential: 0 };
      cCur.count += 1;
      if (s.isComparable) cCur.potential += s.savings;
      condoMap.set(cKey, cCur);
    }

    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([ym, vals]) => ({
        ym,
        label: formatMonthKey(ym),
        potential: Math.round(vals.potential * 100) / 100,
        confirmed: Math.round(vals.confirmed * 100) / 100,
      }));

    const maxMonthValue = Math.max(
      1,
      ...months.map((m) => Math.max(m.potential, Math.abs(m.confirmed)))
    );

    const byCondo = Array.from(condoMap.entries())
      .map(([name, vals]) => ({
        name,
        count: vals.count,
        potential: Math.round(vals.potential * 100) / 100,
      }))
      .sort((a, b) => b.potential - a.potential);

    return {
      confirmedTotal: Math.round(confirmedTotal * 100) / 100,
      confirmedCount,
      potentialTotal: Math.round(potentialTotal * 100) / 100,
      comparableCount,
      concludedCount,
      pricedProposals,
      maoObraTotal: Math.round(maoObraTotal * 100) / 100,
      materialTotal: Math.round(materialTotal * 100) / 100,
      naoDiscTotal: Math.round(naoDiscTotal * 100) / 100,
      months,
      maxMonthValue,
      byCondo,
    };
  }, [filtered]);

  function handleDownloadCsv() {
    const header = [
      "Protocolo",
      "Condomínio",
      "Serviço / Objeto",
      "Data Análise",
      "Status",
      "Propostas",
      "Melhor Fornecedor",
      "Melhor Valor",
      "Economia Potencial",
      "Economia Confirmada",
    ];
    const rows = filtered.map((q) => {
      const s = computeSummary(q);
      const rec = recordedSavings(q);
      return [
        q.protocol,
        q.condominium,
        q.service,
        formatDateBR(q.analysisDate),
        STATUS_META[q.status]?.label ?? q.status,
        String(s.pricedSupplierCount),
        s.best?.supplier.name ?? "",
        s.best?.total != null ? s.best.total.toFixed(2).replace(".", ",") : "",
        s.isComparable ? s.savings.toFixed(2).replace(".", ",") : "",
        rec !== null ? rec.toFixed(2).replace(".", ",") : "",
      ];
    });
    const csv = [header, ...rows]
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Indicadores-Gerencial_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function refreshDownloads() {
    setRefreshingDownloads(true);
    try {
      const res = await fetch("/api/pdf-downloads");
      const json = await res.json();
      if (res.ok && json.downloads) {
        setDownloads(json.downloads);
      }
    } finally {
      setRefreshingDownloads(false);
    }
  }

  async function handleDownloadPdf() {
    setLoadingPdf(true);
    try {
      const res = await fetch("/api/indicators/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condominium: condoFilter,
          startDate,
          endDate,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.base64) {
        throw new Error(json.error || "Erro ao gerar PDF.");
      }

      const bin = window.atob(json.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = json.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);

      await refreshDownloads();
    } finally {
      setLoadingPdf(false);
    }
  }

  return (
    <main className="dashboard-print mx-auto max-w-[1280px] px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/"
        className="no-print inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao painel
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-dark">
            Governança em números
          </p>
          <h1 className="font-display mt-1 text-[30px] leading-tight text-ink sm:text-[34px]">
            Indicadores para assembleia
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Uma visão clara das cotações e dos resultados registrados.
          </p>
        </div>

        <div className="no-print flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="btn btn-ghost"
          >
            <Download className="h-4 w-4" />
            Baixar CSV
          </button>
          <button
            type="button"
            disabled={loadingPdf}
            onClick={handleDownloadPdf}
            className="btn btn-primary"
          >
            {loadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Baixar PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-ghost"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Filters */}
      <section className="no-print card mt-5 flex flex-wrap items-end gap-3 px-4 py-3.5 sm:px-5">
        <label className="min-w-[200px] flex-1">
          <span className="label">Condomínio</span>
          <select
            value={condoFilter}
            onChange={(e) => setCondoFilter(e.target.value)}
            className="field mt-1"
          >
            <option value="">Todos os condomínios</option>
            {condoOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label">Data inicial</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="field mt-1"
          />
        </label>

        <label>
          <span className="label">Data final</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="field mt-1"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setCondoFilter("");
            setStartDate("");
            setEndDate("");
          }}
          className="btn btn-ghost"
        >
          Limpar filtros
        </button>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <p>
          Exibindo <strong className="text-ink">{filtered.length} mapa(s)</strong>{" "}
          · {condoFilter || "Todos os condomínios"} ·{" "}
          {startDate ? formatDateBR(startDate) : "Início"} a{" "}
          {endDate ? formatDateBR(endDate) : "hoje"}
        </p>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-dark">
          Dados dos mapas salvos
        </span>
      </div>

      {/* 4 KPI cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="break-inside-avoid rounded-2xl border border-ink bg-ink px-4 py-4 text-white shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-white/60">
              Economia confirmada
            </p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-ink">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[23px] font-extrabold tracking-tight text-white tabular-nums">
            {metrics.confirmedCount > 0
              ? formatCurrency(metrics.confirmedTotal)
              : "—"}
          </p>
          <p className="mt-1 text-[10.5px] text-white/60">
            {metrics.confirmedCount} contratação(ões) com valores confirmados
          </p>
        </div>

        <div className="card break-inside-avoid px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-500">
              Economia potencial
            </p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand-dark">
              <TrendingDown className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[23px] font-extrabold tracking-tight text-ink tabular-nums">
            {formatCurrency(metrics.potentialTotal)}
          </p>
          <p className="mt-1 text-[10.5px] text-slate-500">
            {metrics.comparableCount} comparativo(s) completos
          </p>
        </div>

        <div className="card break-inside-avoid px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-500">
              Mapas de cotação
            </p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand-dark">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[23px] font-extrabold tracking-tight text-ink">
            {filtered.length}
          </p>
          <p className="mt-1 text-[10.5px] text-slate-500">
            {metrics.concludedCount} concluído(s) no período
          </p>
        </div>

        <div className="card break-inside-avoid px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-500">
              Propostas com valor
            </p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand-dark">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[23px] font-extrabold tracking-tight text-ink">
            {metrics.pricedProposals}
          </p>
          <p className="mt-1 text-[10.5px] text-slate-500">
            Fornecedores com preço informado
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[1.45fr_1fr]">
        <section className="card break-inside-avoid px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-dark">
                Evolução dos resultados
              </p>
              <h2 className="mt-1 text-[16px] font-extrabold text-ink">
                Economia por mês
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Últimos meses com movimentação no período selecionado
              </p>
            </div>
            <span className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full bg-brand" /> Potencial
              <span className="ml-1 h-2 w-2 rounded-full bg-success" />{" "}
              Confirmada
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {metrics.months.map((m) => (
              <div
                key={m.ym}
                className="grid grid-cols-[54px_1fr_86px] items-center gap-2"
              >
                <span className="text-[11px] font-bold text-slate-500">
                  {m.label}
                </span>
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-paper">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{
                        width: `${Math.min(
                          100,
                          (m.potential / metrics.maxMonthValue) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-paper">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{
                        width: `${Math.min(
                          100,
                          (Math.abs(m.confirmed) / metrics.maxMonthValue) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-right text-[10px] font-bold text-ink tabular-nums">
                  {formatCurrency(m.potential)}
                </span>
              </div>
            ))}

            {metrics.months.length === 0 && (
              <p className="py-6 text-center text-[12px] text-slate-500">
                Sem movimentações no período filtrado.
              </p>
            )}
          </div>

          <p className="mt-4 text-[10px] leading-relaxed text-slate-400">
            Barras verdes indicam a magnitude da economia confirmada; confira a
            tabela para valores negativos. Potencial é a diferença entre
            propostas completas, não lucro efetivo.
          </p>
        </section>

        <section className="card break-inside-avoid px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-dark">
            Por condomínio
          </p>
          <h2 className="mt-1 text-[16px] font-extrabold text-ink">
            Resultados por local
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Economia potencial dos mapas comparáveis
          </p>

          <div className="mt-4 divide-y divide-line">
            {metrics.byCondo.map((c) => (
              <div key={c.name} className="flex items-center gap-2 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-paper text-ink">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-bold text-ink">
                    {c.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {c.count} mapa(s)
                  </span>
                </span>
                <span className="text-right text-[11px] font-extrabold text-ink tabular-nums">
                  {formatCurrency(c.potential)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Cost composition */}
      <section className="card mt-4 break-inside-avoid px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-dark">
          Composição das propostas
        </p>
        <h2 className="mt-1 text-[15px] font-extrabold text-ink">
          Mão de obra e materiais
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Soma das menores propostas completas dos comparativos no período.
          Valores globais permanecem não discriminados.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-paper px-3 py-2.5">
            <p className="text-[10px] font-bold text-slate-500">Mão de obra</p>
            <p className="mt-1 text-[14px] font-extrabold text-ink tabular-nums">
              {formatCurrency(metrics.maoObraTotal)}
            </p>
          </div>
          <div className="rounded-xl bg-paper px-3 py-2.5">
            <p className="text-[10px] font-bold text-slate-500">Material</p>
            <p className="mt-1 text-[14px] font-extrabold text-ink tabular-nums">
              {formatCurrency(metrics.materialTotal)}
            </p>
          </div>
          <div className="rounded-xl bg-paper px-3 py-2.5">
            <p className="text-[10px] font-bold text-slate-500">
              Não discriminado
            </p>
            <p className="mt-1 text-[14px] font-extrabold text-ink tabular-nums">
              {formatCurrency(metrics.naoDiscTotal)}
            </p>
          </div>
        </div>
      </section>

      {/* PDF History */}
      <section className="card mt-4 break-inside-avoid overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-dark">
              Downloads
            </p>
            <h2 className="mt-1 text-[15px] font-extrabold text-ink">
              Histórico de arquivos PDF
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Nome do arquivo registrado a cada download gerado.
            </p>
          </div>
          <button
            type="button"
            disabled={refreshingDownloads}
            onClick={refreshDownloads}
            className="no-print btn btn-ghost !py-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                refreshingDownloads ? "animate-spin" : ""
              }`}
            />
            Atualizar lista
          </button>
        </div>

        <ul className="divide-y divide-line">
          {downloads.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-3 px-5 py-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-dark">
                <FileText className="h-4 w-4" />
              </span>
              <span className="min-w-[220px] flex-1">
                <span
                  className="block truncate text-[11.5px] font-bold text-ink"
                  title={d.fileName}
                >
                  {d.fileName}
                </span>
                <span className="block text-[10px] text-slate-500">
                  {d.kind === "indicadores"
                    ? "Relatório de indicadores"
                    : "Mapa de cotação"}
                  {d.condominium ? ` · ${d.condominium}` : ""} ·{" "}
                  {formatDateTimeBR(d.createdAt)}
                </span>
              </span>
              <span className="text-[10.5px] font-semibold text-slate-500">
                {formatSize(d.sizeBytes)}
              </span>
            </li>
          ))}
          {downloads.length === 0 && (
            <li className="px-5 py-6 text-center text-[12px] text-slate-500">
              Nenhum PDF gerado ainda.
            </li>
          )}
        </ul>
      </section>

      {/* Detailed table */}
      <section className="card mt-4 break-inside-avoid overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-dark">
              Detalhamento
            </p>
            <h2 className="mt-1 text-[15px] font-extrabold text-ink">
              Mapas do período
            </h2>
          </div>
          <span className="text-[10.5px] text-slate-500">
            Clique no mapa para editar os valores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[11.5px]">
            <thead className="bg-paper text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Condomínio / objeto</th>
                <th className="px-3 py-2.5">Data</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Melhor proposta</th>
                <th className="px-3 py-2.5 text-right">Potencial</th>
                <th className="px-4 py-2.5 text-right">Confirmada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((q) => {
                const s = computeSummary(q);
                const rec = recordedSavings(q);
                const st = STATUS_META[q.status] ?? STATUS_META.em_analise;
                return (
                  <tr key={q.id} className="hover:bg-brand-soft/30">
                    <td className="px-4 py-2.5">
                      <Link href={`/mapas/${q.id}`} className="block">
                        <span className="font-bold text-ink hover:text-brand-dark">
                          {q.condominium}
                        </span>
                        <span className="block text-[10.5px] text-slate-500">
                          {q.protocol} · {q.service}
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {formatDateBR(q.analysisDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${st.badgeClass}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-ink tabular-nums">
                      {formatCurrency(s.best?.total ?? null)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-brand-dark tabular-nums">
                      {s.isComparable ? formatCurrency(s.savings) : "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-extrabold tabular-nums ${
                        rec !== null && rec < 0
                          ? "text-red-700"
                          : "text-success"
                      }`}
                    >
                      {rec !== null ? formatCurrency(rec) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
