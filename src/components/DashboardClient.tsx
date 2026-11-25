"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  FileSpreadsheet,
  Search,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import {
  computeSummary,
  formatCurrency,
  formatCurrencyCompact,
  formatDateBR,
  formatDateLongBR,
  normalizeText,
  type QuotationSummary,
} from "@/lib/calculations";
import {
  STATUS_META,
  type CondominiumRecord,
  type QuotationRecord,
  type QuotationStatus,
} from "@/lib/types";

type SearchField =
  | "todos"
  | "protocol"
  | "condominium"
  | "service"
  | "description"
  | "category"
  | "date"
  | "supplier"
  | "bestValue"
  | "savings"
  | "status";

const SEARCH_FIELD_OPTIONS: { value: SearchField; label: string }[] = [
  { value: "todos", label: "Todos os campos" },
  { value: "protocol", label: "Protocolo" },
  { value: "condominium", label: "Condomínio / Associação" },
  { value: "service", label: "Serviço / Objeto" },
  { value: "description", label: "Descrição" },
  { value: "category", label: "Categoria" },
  { value: "date", label: "Data da análise" },
  { value: "supplier", label: "Fornecedor (melhor proposta)" },
  { value: "bestValue", label: "Melhor valor (R$)" },
  { value: "savings", label: "Economia (R$ / %)" },
  { value: "status", label: "Status" },
];

function currencyVariants(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  const br = value.toFixed(2).replace(".", ",");
  const dot = value.toFixed(2);
  return [formatCurrency(value), br, dot].join(" ");
}

function digitsOf(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return String(Math.round(Math.abs(value) * 100));
}

function dateDigits(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso.replace(/\D/g, "");
  return `${m[3]}${m[2]}${m[1]}${m[1]}${m[2]}${m[3]}`;
}

interface EnrichedItem {
  quotation: QuotationRecord;
  summary: QuotationSummary;
}

function buildHaystack({ quotation, summary }: EnrichedItem) {
  const statusLabel = STATUS_META[quotation.status]?.label ?? quotation.status;
  const kindLabel = quotation.kind === "produtos" ? "Produtos" : "Serviço";
  const dateBR = formatDateBR(quotation.analysisDate);
  const dateLong = formatDateLongBR(quotation.analysisDate);
  const allSupplierNames = quotation.suppliers.map((s) => s.name).join(" ");
  const bestValueText = currencyVariants(summary.best?.total ?? null);
  const savingsText = currencyVariants(
    summary.isComparable ? summary.savings : null
  );

  const text: Record<SearchField, string> = {
    todos: [
      quotation.protocol,
      quotation.condominium,
      quotation.service,
      quotation.description,
      quotation.category,
      kindLabel,
      dateBR,
      dateLong,
      quotation.analysisDate,
      allSupplierNames,
      summary.best?.supplier.name ?? "",
      bestValueText,
      savingsText,
      summary.isComparable ? `${summary.savingsPercent.toFixed(1)}%` : "",
      statusLabel,
      `${summary.supplierCount} fornecedores`,
      `${summary.itemCount} itens`,
    ].join(" "),
    protocol: quotation.protocol,
    condominium: quotation.condominium,
    service: `${quotation.service} ${quotation.description}`,
    description: quotation.description,
    category: `${quotation.category} ${kindLabel}`,
    date: `${dateBR} ${dateLong} ${quotation.analysisDate}`,
    supplier: `${allSupplierNames} ${summary.best?.supplier.name ?? ""}`,
    bestValue: bestValueText,
    savings: `${savingsText} ${
      summary.isComparable ? `${summary.savingsPercent.toFixed(1)}%` : ""
    }`,
    status: statusLabel,
  };

  const digits: Record<SearchField, string> = {
    todos: [
      quotation.protocol.replace(/\D/g, ""),
      dateDigits(quotation.analysisDate),
      digitsOf(summary.best?.total ?? null),
      digitsOf(summary.isComparable ? summary.savings : null),
    ].join(" "),
    protocol: quotation.protocol.replace(/\D/g, ""),
    condominium: "",
    service: "",
    description: "",
    category: "",
    date: dateDigits(quotation.analysisDate),
    supplier: "",
    bestValue: digitsOf(summary.best?.total ?? null),
    savings: digitsOf(summary.isComparable ? summary.savings : null),
    status: "",
  };

  return { text, digits };
}

interface DashboardClientProps {
  quotations: QuotationRecord[];
  condominiums: CondominiumRecord[];
  aiConfigured: boolean;
  aiModel: string;
}

export function DashboardClient({
  quotations,
  condominiums,
  aiConfigured,
  aiModel,
}: DashboardClientProps) {
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | QuotationStatus>(
    "todos"
  );

  const enriched = useMemo(
    () =>
      quotations.map((q) => ({
        quotation: q,
        summary: computeSummary(q),
      })),
    [quotations]
  );

  const latest = enriched[0] ?? null;

  const stats = useMemo(() => {
    let concluded = 0;
    let inAnalysis = 0;
    let totalPotential = 0;
    for (const item of enriched) {
      if (item.quotation.status === "concluido") concluded += 1;
      else if (item.quotation.status === "em_analise") inAnalysis += 1;
      if (item.summary.isComparable) {
        totalPotential += item.summary.savings;
      }
    }
    return {
      total: enriched.length,
      concluded,
      inAnalysis,
      totalPotential,
      condoCount: condominiums.length,
    };
  }, [enriched, condominiums]);

  const haystacks = useMemo(
    () => enriched.map((item) => buildHaystack(item)),
    [enriched]
  );

  const filtered = useMemo(() => {
    const nq = normalizeText(search.trim());
    const qd = search.replace(/\D/g, "");
    return enriched
      .map((item, index) => ({ item, haystack: haystacks[index] }))
      .filter(({ item, haystack }) => {
        if (statusFilter !== "todos" && item.quotation.status !== statusFilter) {
          return false;
        }
        if (!nq) return true;
        const textHit = normalizeText(haystack.text[searchField]).includes(nq);
        const digitHit = qd.length >= 2 && haystack.digits[searchField].includes(qd);
        return textHit || digitHit;
      })
      .map(({ item }) => item);
  }, [enriched, haystacks, search, searchField, statusFilter]);

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-ink text-white shadow-[0_30px_60px_-40px_rgba(24,20,71,0.8)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 82% 18%, rgba(250,177,42,0.55) 0, transparent 42%), radial-gradient(circle at 12% 90%, rgba(250,177,42,0.25) 0, transparent 38%)",
          }}
        />
        <div className="relative grid gap-6 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Governança condominial · cotações
            </p>
            <h1 className="font-display mt-3 max-w-[560px] text-[30px] leading-[1.08] sm:text-[40px]">
              Cada decisão do condomínio começa com um mapa de cotação claro.
            </h1>
            <p className="mt-2.5 max-w-[540px] text-[13px] leading-relaxed text-white/70 sm:text-[14px]">
              Envie as propostas em PDF ou imagem, deixe a IA gratuita montar o
              comparativo e mantenha o padrão Gerencial de análise — com campos
              editáveis para a realidade de cada condomínio.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link href="/mapas/novo" className="btn btn-brand">
                <Sparkles className="h-4 w-4" />
                Criar mapa com IA
              </Link>
              <a
                href="#mapas"
                className="btn border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Ver mapas de cotação
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3 w-3 text-brand" />
                PDF, JPG e PNG
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3 w-3 text-brand" />
                Campos do cabeçalho editáveis
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3 w-3 text-brand" />
                Documento pronto para assinatura
              </span>
            </div>
          </div>

          {latest ? (
            <div className="rounded-xl border border-brand/30 bg-white/[0.07] p-4 backdrop-blur-sm">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand">
                Último mapa elaborado
              </p>
              <p className="mt-1 text-[15px] font-extrabold leading-tight">
                {latest.quotation.condominium}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-white/60">
                {latest.quotation.service}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/10 px-2.5 py-2">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/50">
                    Melhor proposta
                  </p>
                  <p className="text-[13px] font-extrabold">
                    {formatCurrency(latest.summary.best?.total ?? null)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/10 px-2.5 py-2">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/50">
                    Economia
                  </p>
                  <p className="text-[13px] font-extrabold text-brand">
                    {latest.summary.isComparable
                      ? formatCurrency(latest.summary.savings)
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-white/50">
                <span className="font-mono">{latest.quotation.protocol}</span>
                <span>{formatDateBR(latest.quotation.analysisDate)}</span>
              </div>
              <Link
                href={`/mapas/${latest.quotation.id}`}
                className="mt-3 flex items-center justify-between rounded-lg bg-brand px-3 py-2 text-[11.5px] font-bold text-ink-deep transition hover:bg-[#ffc14d]"
              >
                Abrir mapa
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-brand/30 bg-white/[0.07] p-5 text-center">
              <p className="text-[13px] font-bold">
                Nenhum mapa cadastrado ainda
              </p>
              <Link href="/mapas/novo" className="btn btn-brand mt-3">
                Criar primeiro mapa
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Indicadores Banner */}
      <Link
        href="/indicadores"
        className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-white px-4 py-3 transition hover:border-brand hover:bg-brand-soft/30"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-brand">
            <BarChart3 className="h-4 w-4" />
          </span>
          <span>
            <strong className="block text-[12.5px] text-ink">
              Dashboard para assembleia
            </strong>
            <span className="block text-[11px] text-slate-500">
              Acompanhe economias, propostas e resultados por condomínio.
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-dark">
          Abrir indicadores <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      {/* 4 KPI Cards */}
      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="label !text-[8.5px]">Mapas no portfólio</p>
              <p className="font-display mt-1 text-[24px] leading-none text-ink">
                {stats.total}
              </p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper text-ink">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
            {stats.concluded} concluído(s) · {stats.inAnalysis} em análise
          </p>
        </div>

        <div className="card px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="label !text-[8.5px]">Economia potencial</p>
              <p className="font-display mt-1 text-[24px] leading-none text-ink">
                {formatCurrencyCompact(stats.totalPotential)}
              </p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand-dark">
              <TrendingDown className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
            Diferença entre propostas completas, não lucro
          </p>
        </div>

        <div className="card px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="label !text-[8.5px]">Condomínios atendidos</p>
              <p className="font-display mt-1 text-[24px] leading-none text-ink">
                {stats.condoCount}
              </p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper text-ink">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
            Associações e condomínios com processo ativo
          </p>
        </div>

        <Link
          href="/configuracoes"
          className="card block px-4 py-3.5 transition hover:border-brand"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="label !text-[8.5px]">Leitura com IA</p>
              <p className="font-display mt-1 text-[24px] leading-none text-ink">
                {aiConfigured ? "Ativa" : "Inativa"}
              </p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-brand">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
            {aiConfigured
              ? `Gemini gratuito conectado (${aiModel})`
              : "Clique para conectar o Gemini gratuito"}
          </p>
        </Link>
      </section>

      {/* Main grid: Table + Sidebar */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
        <section className="card overflow-hidden" id="mapas">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-[15px] font-extrabold text-ink">
                Mapas de cotação
              </h2>
              <p className="text-[11.5px] text-slate-500">
                {quotations.length} processo(s) · histórico comparativo por
                condomínio
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5">
                <span className="label hidden !text-[8px] lg:inline">
                  Buscar em
                </span>
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value as SearchField)}
                  aria-label="Campo de busca"
                  className="field !w-auto !py-1.5 text-[11px] font-bold"
                >
                  {SEARCH_FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    searchField === "todos"
                      ? "Buscar em todos os campos…"
                      : `Buscar em ${
                          SEARCH_FIELD_OPTIONS.find(
                            (o) => o.value === searchField
                          )?.label ?? ""
                        }…`
                  }
                  aria-label="Buscar mapas de cotação"
                  className="field w-[240px] !py-1.5 pl-8 text-[12px]"
                />
              </div>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-md px-2 py-1.5 text-[10.5px] font-bold text-slate-400 transition hover:bg-paper hover:text-ink"
                  aria-label="Limpar busca"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-[#fbfcfc] px-4 py-2.5 sm:px-5">
            {(
              [
                { key: "todos", label: "Todos" },
                { key: "em_analise", label: "Em análise" },
                { key: "concluido", label: "Concluídos" },
                { key: "rascunho", label: "Rascunhos" },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition ${
                    active
                      ? "bg-ink text-white"
                      : "bg-white text-slate-500 ring-1 ring-line hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            <span className="ml-auto self-center text-[10.5px] font-semibold text-slate-400">
              {filtered.length} resultado(s)
            </span>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-white text-left">
                  <th className="border-b border-line px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Protocolo
                  </th>
                  <th className="border-b border-line px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Condomínio / objeto
                  </th>
                  <th className="border-b border-line px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Análise
                  </th>
                  <th className="border-b border-line px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Propostas
                  </th>
                  <th className="border-b border-line px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Melhor proposta
                  </th>
                  <th className="border-b border-line px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Economia
                  </th>
                  <th className="border-b border-line px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>
                  <th className="border-b border-line px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ quotation, summary }) => {
                  const st = STATUS_META[quotation.status] ?? STATUS_META.em_analise;
                  return (
                    <tr
                      key={quotation.id}
                      className="group transition hover:bg-brand-soft/40"
                    >
                      <td className="border-b border-line px-3 py-2.5 align-middle">
                        <span className="rounded-md bg-paper px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-600">
                          {quotation.protocol}
                        </span>
                      </td>
                      <td className="border-b border-line px-3 py-2.5">
                        <Link
                          href={`/mapas/${quotation.id}`}
                          className="block"
                        >
                          <span className="block font-bold text-ink group-hover:text-brand-dark">
                            {quotation.condominium}
                          </span>
                          <span className="block max-w-[280px] truncate text-[11px] text-slate-500">
                            {quotation.service}
                          </span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-2.5 text-[11.5px] text-slate-600">
                        {formatDateBR(quotation.analysisDate)}
                      </td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-2.5 text-[11.5px] text-slate-600">
                        {summary.supplierCount} forn. · {summary.itemCount} itens
                      </td>
                      <td className="border-b border-line px-3 py-2.5">
                        <span className="block max-w-[165px] truncate text-[11.5px] font-bold text-ink">
                          {summary.best?.supplier.name || "—"}
                        </span>
                        <span className="block text-[11px] font-extrabold text-success tabular-nums">
                          {formatCurrency(summary.best?.total ?? null)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-2.5 text-[11.5px] font-extrabold text-brand-dark tabular-nums">
                        {summary.isComparable && summary.savings > 0
                          ? formatCurrency(summary.savings)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${st.badgeClass}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="border-b border-line px-3 py-2.5 text-right">
                        <Link
                          href={`/mapas/${quotation.id}`}
                          aria-label={`Abrir ${quotation.protocol}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition group-hover:bg-white group-hover:text-ink"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-[12.5px] text-slate-500"
                    >
                      Nenhum mapa encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-line md:hidden">
            {filtered.map(({ quotation, summary }) => {
              const st = STATUS_META[quotation.status] ?? STATUS_META.em_analise;
              return (
                <li key={quotation.id}>
                  <Link
                    href={`/mapas/${quotation.id}`}
                    className="block px-4 py-3 transition hover:bg-brand-soft/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-ink">
                          {quotation.condominium}
                        </p>
                        <p className="truncate text-[11.5px] text-slate-500">
                          {quotation.service}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.badgeClass}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span className="font-mono font-bold text-slate-600">
                        {quotation.protocol}
                      </span>
                      <span>{formatDateBR(quotation.analysisDate)}</span>
                      <span>{summary.supplierCount} fornecedores</span>
                      <span className="ml-auto font-extrabold text-success">
                        {formatCurrency(summary.best?.total ?? null)}
                      </span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right Sidebar */}
        <aside className="space-y-4">
          <section className="card overflow-hidden">
            <div className="bg-ink px-4 py-4 text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-ink-deep">
                <Sparkles className="h-3 w-3" />
                Assistente Gerencial · grátis
              </span>
              <h2 className="font-display mt-2 text-[20px] leading-tight">
                Da proposta ao mapa, em segundos.
              </h2>
              <p className="mt-1 text-[11.5px] leading-snug text-white/70">
                Envie PDFs das cotações ou fotos dos orçamentos. A IA identifica
                fornecedores, itens, valores e redige o parecer técnico.
              </p>
              <Link href="/mapas/novo" className="btn btn-brand mt-3 w-full">
                <Sparkles className="h-4 w-4" />
                Analisar propostas
              </Link>
            </div>
            <ol className="divide-y divide-line">
              <li className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-extrabold text-brand-dark">
                  1
                </span>
                <div>
                  <p className="text-[11.5px] font-bold text-ink">
                    Envie os documentos
                  </p>
                  <p className="text-[10.5px] leading-snug text-slate-500">
                    PDF, JPG ou PNG — até 6 arquivos por análise.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-extrabold text-brand-dark">
                  2
                </span>
                <div>
                  <p className="text-[11.5px] font-bold text-ink">
                    Revise o comparativo
                  </p>
                  <p className="text-[10.5px] leading-snug text-slate-500">
                    Campos editáveis por condomínio e categoria.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-extrabold text-brand-dark">
                  3
                </span>
                <div>
                  <p className="text-[11.5px] font-bold text-ink">
                    Aprove e arquive
                  </p>
                  <p className="text-[10.5px] leading-snug text-slate-500">
                    Documento no padrão Gerencial, pronto para PDF.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section className="card" id="condominios">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <Link
                  href="/condominios"
                  className="text-[13.5px] font-extrabold text-ink hover:underline"
                >
                  Condomínios atendidos
                </Link>
                <p className="text-[10.5px] text-slate-500">
                  Base da governança Gerencial
                </p>
              </div>
              <Building2 className="h-4 w-4 text-slate-400" />
            </div>
            <ul className="divide-y divide-line">
              {condominiums.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-ink">
                      {c.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {c.city || "Cidade não informada"}
                      {c.manager ? ` · ${c.manager}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {c.mapCount} mapa(s)
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5">
              <Link
                href="/condominios"
                className="text-[11px] font-bold text-brand-dark hover:underline"
              >
                Gerenciar condomínios e associações →
              </Link>
            </div>
          </section>
        </aside>
      </div>

      <p className="mt-6 text-center text-[10.5px] text-slate-400">
        Gerencial · Governança Condominial — padrão institucional de mapas de
        cotação. Documentos gerados para apoio à decisão do síndico e do
        conselho.
      </p>
    </main>
  );
}
