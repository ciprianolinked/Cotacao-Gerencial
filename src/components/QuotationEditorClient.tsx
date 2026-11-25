"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Package,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  computeSummary,
  detectTrustedStore,
  formatCurrency,
  formatDateLongBR,
  generateAutomaticAnalysis,
  lowestPriceForItem,
  mergeComplementary,
  recordedSavings,
  round2,
  todayISO,
  uid,
} from "@/lib/calculations";
import {
  CATEGORIES,
  STATUS_META,
  UNITS,
  type CostType,
  type ProductSearchResult,
  type QuotationData,
  type QuotationItem,
  type QuotationKind,
  type QuotationStatus,
  type Supplier,
} from "@/lib/types";
import { CurrencyInput } from "./CurrencyInput";
import { QuotationDocumentSheet } from "./QuotationDocumentSheet";
import { AiUploadPanel } from "./AiUploadPanel";
import { ProductSearchPanel } from "./ProductSearchPanel";

interface QuotationEditorClientProps {
  quotationId: string;
  protocol: string;
  initial: QuotationData;
  condominiums: string[];
}

function saveBase64Pdf(fileName: string, base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function QuotationEditorClient({
  quotationId,
  protocol,
  initial,
  condominiums,
}: QuotationEditorClientProps) {
  const router = useRouter();
  const [data, setData] = useState<QuotationData>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [searchingItems, setSearchingItems] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const summary = useMemo(() => computeSummary(data), [data]);
  const maxTotal = useMemo(() => {
    const totals = summary.rankings
      .map((r) => r.total ?? 0)
      .filter((n) => n > 0);
    return totals.length > 0 ? Math.max(...totals) : 1;
  }, [summary]);

  const outcome = data.analysis.outcome ?? {
    supplierId: "",
    referenceAmount: null,
    contractedAmount: null,
    confirmed: false,
  };

  const selectedOutcomeRanking = summary.rankings.find(
    (r) => r.supplier.id === outcome.supplierId
  );

  const liveOutcomeDiff =
    outcome.referenceAmount !== null &&
    outcome.contractedAmount !== null &&
    Number.isFinite(outcome.referenceAmount) &&
    Number.isFinite(outcome.contractedAmount)
      ? round2(outcome.referenceAmount - outcome.contractedAmount)
      : null;

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const updateData = (updater: (prev: QuotationData) => QuotationData) => {
    setData((prev) => updater(prev));
    setDirty(true);
  };

  async function saveQuotation(nextData?: QuotationData): Promise<boolean> {
    const payload = nextData ?? data;
    setSaving(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Não foi possível salvar o mapa.");
      }
      setDirty(false);
      showToast("success", "Mapa salvo com sucesso.");
      return true;
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao salvar mapa."
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      if (dirty) {
        const ok = await saveQuotation();
        if (!ok) return;
      }
      const res = await fetch(`/api/quotations/${quotationId}/pdf`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.base64) {
        throw new Error(json.error || "Falha ao gerar o PDF.");
      }
      saveBase64Pdf(json.fileName, json.base64);
      showToast("success", `PDF gerado: ${json.fileName}`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao baixar PDF."
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o mapa ${protocol} (${data.service})? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Não foi possível excluir.");
      router.push("/");
      router.refresh();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao excluir mapa."
      );
      setDeleting(false);
    }
  }

  function handleRecalculateAnalysis() {
    const auto = generateAutomaticAnalysis(data);
    updateData((prev) => ({
      ...prev,
      analysis: {
        ...prev.analysis,
        summary: auto.summary,
        recommendation: auto.recommendation,
      },
    }));
    showToast("info", "Parecer técnico e recomendação recalculados.");
  }

  function addSupplier() {
    if (data.suppliers.length >= 5) return;
    const letter = String.fromCharCode(65 + data.suppliers.length);
    const id = uid(`sup_${data.suppliers.length}`);
    const newSup: Supplier = {
      id,
      name: `Fornecedor ${letter}`,
      contact: "",
      deliveryDays: "",
      paymentTerms: "",
      validity: "",
      notes: "",
    };
    updateData((prev) => ({
      ...prev,
      suppliers: [...prev.suppliers, newSup],
      items: prev.items.map((it) => ({
        ...it,
        prices: { ...it.prices, [id]: null },
      })),
    }));
  }

  function updateSupplier(supId: string, patch: Partial<Supplier>) {
    updateData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) => {
        if (s.id !== supId) return s;
        const next = { ...s, ...patch };
        if ("purchaseUrl" in patch) {
          const check = detectTrustedStore(patch.purchaseUrl);
          next.purchaseVerified = check.verified;
          next.purchaseStore = check.store;
          next.purchaseSource = "manual";
        }
        return next;
      }),
    }));
  }

  function removeSupplier(supId: string) {
    if (data.suppliers.length <= 1) return;
    updateData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== supId),
      items: prev.items.map((it) => {
        const nextPrices = { ...it.prices };
        delete nextPrices[supId];
        return { ...it, prices: nextPrices };
      }),
      analysis: {
        ...prev.analysis,
        outcome:
          prev.analysis.outcome?.supplierId === supId
            ? {
                ...prev.analysis.outcome,
                supplierId: "",
                contractedAmount: null,
              }
            : prev.analysis.outcome,
      },
    }));
  }

  function addItem() {
    const newItem: QuotationItem = {
      id: uid(`itm_${data.items.length}`),
      description: "",
      unit: data.kind === "produtos" ? "un" : "serviço",
      quantity: 1,
      prices: Object.fromEntries(data.suppliers.map((s) => [s.id, null])),
      costType: data.kind === "produtos" ? "material" : "nao_discriminado",
    };
    updateData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  }

  function updateItem(itemId: string, patch: Partial<QuotationItem>) {
    updateData((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.id !== itemId) return it;
        const next = { ...it, ...patch };
        if ("purchaseUrl" in patch) {
          const check = detectTrustedStore(patch.purchaseUrl);
          next.purchaseVerified = check.verified;
          next.purchaseStore = check.store || next.purchaseStore;
          next.purchaseSource = "manual";
        }
        return next;
      }),
    }));
  }

  function updateItemPrice(itemId: string, supId: string, val: number | null) {
    updateData((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id === itemId
          ? { ...it, prices: { ...it.prices, [supId]: val } }
          : it
      ),
    }));
  }

  function removeItem(itemId: string) {
    if (data.items.length <= 1) return;
    updateData((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== itemId),
    }));
  }

  function updateOutcome(patch: Partial<QuotationData["analysis"]["outcome"]>) {
    updateData((prev) => ({
      ...prev,
      analysis: {
        ...prev.analysis,
        outcome: {
          ...(prev.analysis.outcome ?? {
            supplierId: "",
            referenceAmount: null,
            contractedAmount: null,
            confirmed: false,
          }),
          ...patch,
        },
      },
    }));
  }

  async function handleSearchMapItems() {
    const queries = data.items
      .map((it) => it.description.trim())
      .filter((d) => d.length > 2)
      .slice(0, 6);
    if (queries.length === 0) {
      showToast("error", "Adicione a descrição de ao menos um item antes de pesquisar.");
      return;
    }

    setSearchingItems(true);
    try {
      const res = await fetch("/api/ai/product-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: queries, condominium: data.condominium }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Não foi possível pesquisar os itens.");
      }

      const found = (json.results ?? []) as ProductSearchResult[];
      if (found.length === 0) {
        showToast(
          "info",
          json.warnings?.[0] || "Nenhum link confiável retornado para os itens."
        );
        return;
      }

      updateData((prev) => ({
        ...prev,
        items: prev.items.map((it) => {
          const match = found.find(
            (r) =>
              it.description
                .toLowerCase()
                .includes(r.query.toLowerCase().slice(0, 16)) ||
              r.query
                .toLowerCase()
                .includes(it.description.toLowerCase().slice(0, 16))
          );
          if (!match) return it;
          return {
            ...it,
            purchaseUrl: match.url,
            purchaseStore: match.store,
            purchasePrice: match.price,
            purchaseVerified: match.verified,
            purchaseSource: "pesquisa",
          };
        }),
      }));
      showToast("success", `${found.length} link(s) de produto encontrados.`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao pesquisar itens."
      );
    } finally {
      setSearchingItems(false);
    }
  }

  function handleAddSearchedProduct(res: ProductSearchResult) {
    const newItem: QuotationItem = {
      id: uid(`itm_${data.items.length}`),
      description: res.title,
      unit: "un",
      quantity: 1,
      prices: Object.fromEntries(data.suppliers.map((s) => [s.id, null])),
      costType: "material",
      purchaseUrl: res.url,
      purchaseStore: res.store,
      purchasePrice: res.price,
      purchaseVerified: res.verified,
      purchaseSource: "pesquisa",
    };
    updateData((prev) => ({
      ...prev,
      kind: "produtos",
      items: [...prev.items, newItem],
    }));
    showToast("success", "Produto adicionado ao mapa.");
  }

  // Checklist of completion items
  const allItemsPriced =
    data.items.length > 0 &&
    data.items.every((it) =>
      Object.values(it.prices).some((v) => v !== null && v !== undefined)
    );
  const checklist = [
    {
      label: "Condomínio/associação identificado",
      done: data.condominium.trim().length > 0,
    },
    {
      label: "Serviço ou objeto descrito",
      done: data.service.trim().length > 0,
    },
    {
      label: "Ao menos 2 fornecedores",
      done: data.suppliers.filter((s) => s.name.trim()).length >= 2,
    },
    {
      label: "Todos os itens com preço",
      done: allItemsPriced,
    },
    {
      label: "Proposta anexada ao processo",
      done: data.attachments.length > 0,
    },
  ];

  const statusMeta = STATUS_META[data.status] ?? STATUS_META.em_analise;

  return (
    <>
      {/* Print-only institutional A4 sheet */}
      <div className="print-page hidden print:block">
        <QuotationDocumentSheet data={data} protocol={protocol} />
      </div>

      {/* Screen UI */}
      <div className="print:hidden">
        {previewMode ? (
          <div className="mx-auto max-w-[1040px] px-4 pb-16 pt-5 sm:px-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className="btn btn-ghost"
              >
                <Pencil className="h-3.5 w-3.5" />
                Voltar à edição
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={handleDownloadPdf}
                  className="btn btn-brand"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
              </div>
            </div>

            <QuotationDocumentSheet data={data} protocol={protocol} />
          </div>
        ) : (
          <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6">
            {/* Top header bar */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-ink"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Painel de cotações
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[26px] leading-tight text-ink sm:text-[30px]">
                    {data.service || "Mapa sem título"}
                  </h1>
                  <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                    {protocol}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-slate-500">
                  {data.condominium || "Condomínio não informado"} · Data
                  análise {formatDateLongBR(data.analysisDate)} ·{" "}
                  <span
                    className={
                      dirty
                        ? "font-bold text-amber-700"
                        : "font-semibold text-success"
                    }
                  >
                    {dirty ? "alterações não salvas" : "salvo"}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Status do mapa"
                  value={data.status}
                  onChange={(e) =>
                    updateData((prev) => ({
                      ...prev,
                      status: e.target.value as QuotationStatus,
                    }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold outline-none ring-1 ring-inset transition ${statusMeta.selectClass}`}
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="em_analise">Em análise</option>
                  <option value="concluido">Concluído</option>
                </select>

                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className="btn btn-ghost"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">Ver documento</span>
                </button>

                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={handleDownloadPdf}
                  className="btn btn-ghost"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Baixar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-ghost"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveQuotation()}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </button>
              </div>
            </div>

            {toast && (
              <div
                className={`mt-3 rounded-xl border px-4 py-2.5 text-[12px] font-semibold ${
                  toast.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : toast.type === "success"
                    ? "border-success/25 bg-success-soft text-success"
                    : "border-brand/40 bg-brand-soft text-brand-dark"
                }`}
              >
                {toast.text}
              </div>
            )}

            {/* Main 2-column layout */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_318px]">
              <div className="space-y-4">
                {/* SECTION 1: Identificação */}
                <section className="card px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-extrabold text-white">
                        1
                      </span>
                      <div>
                        <h2 className="text-[14px] font-extrabold leading-tight text-ink">
                          Identificação do mapa
                        </h2>
                        <p className="mt-0.5 max-w-xl text-[11.5px] leading-snug text-slate-500">
                          Cabeçalho editável — um mapa por condomínio ou
                          associação.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      {data.kind === "produtos" ? (
                        <Package className="h-3 w-3" />
                      ) : (
                        <Wrench className="h-3 w-3" />
                      )}
                      {data.kind === "produtos" ? "Produtos" : "Serviço"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-6">
                    <label className="sm:col-span-4">
                      <span className="label">Condomínio / Associação *</span>
                      <input
                        list="condominios-lista"
                        value={data.condominium}
                        onChange={(e) =>
                          updateData((prev) => ({
                            ...prev,
                            condominium: e.target.value,
                          }))
                        }
                        className="field mt-1"
                        placeholder="Selecione ou digite o condomínio"
                      />
                      <datalist id="condominios-lista">
                        {condominiums.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </label>

                    <div className="sm:col-span-2">
                      <span className="label">Data análise</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="date"
                          value={data.analysisDate}
                          onChange={(e) =>
                            updateData((prev) => ({
                              ...prev,
                              analysisDate: e.target.value,
                            }))
                          }
                          className="field"
                        />
                        <button
                          type="button"
                          title="Usar data de hoje"
                          onClick={() =>
                            updateData((prev) => ({
                              ...prev,
                              analysisDate: todayISO(),
                            }))
                          }
                          className="shrink-0 rounded-lg border border-line px-2 py-2 text-[10.5px] font-bold text-slate-500 transition hover:border-brand-dark hover:text-brand-dark"
                        >
                          Hoje
                        </button>
                      </div>
                    </div>

                    <label className="sm:col-span-3">
                      <span className="label">A/C</span>
                      <input
                        value={data.recipient}
                        onChange={(e) =>
                          updateData((prev) => ({
                            ...prev,
                            recipient: e.target.value,
                          }))
                        }
                        className="field mt-1"
                        placeholder="Síndico(a), conselho, diretoria…"
                      />
                    </label>

                    <label className="sm:col-span-3">
                      <span className="label">Serviço / Objeto</span>
                      <input
                        value={data.service}
                        onChange={(e) =>
                          updateData((prev) => ({
                            ...prev,
                            service: e.target.value,
                          }))
                        }
                        className="field mt-1"
                        placeholder="Ex.: manutenção de elevadores"
                      />
                    </label>

                    <label className="sm:col-span-6">
                      <span className="label">Descrição</span>
                      <textarea
                        rows={3}
                        value={data.description}
                        onChange={(e) =>
                          updateData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="field mt-1 resize-y"
                        placeholder="Descreva o escopo, a necessidade do condomínio e as premissas desta cotação."
                      />
                    </label>

                    <div className="sm:col-span-4">
                      <span className="label">Natureza da cotação</span>
                      <div className="mt-1 inline-flex rounded-lg border border-line bg-white p-1">
                        {(
                          [
                            { key: "servico", label: "Serviço" },
                            { key: "produtos", label: "Produtos" },
                          ] as { key: QuotationKind; label: string }[]
                        ).map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() =>
                              updateData((prev) => ({
                                ...prev,
                                kind: opt.key,
                              }))
                            }
                            className={`rounded-md px-3 py-1.5 text-[12px] font-bold transition ${
                              data.kind === opt.key
                                ? "bg-ink text-white"
                                : "text-slate-500 hover:text-ink"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[10.5px] text-slate-500">
                        Use “Produtos” para listas de materiais (elétrica,
                        hidráulica, piscina e outros).
                      </p>
                    </div>

                    <label className="sm:col-span-2">
                      <span className="label">Categoria</span>
                      <select
                        value={data.category}
                        onChange={(e) =>
                          updateData((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        className="field mt-1"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                {/* Inline AI reader card */}
                <section>
                  <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-dark">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[13px] font-extrabold text-ink">
                          Leitura de propostas com IA
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Envie PDF ou imagem das cotações e a IA preenche este
                          mapa automaticamente.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiOpen((v) => !v)}
                      className="btn btn-ghost"
                    >
                      {aiOpen
                        ? "Fechar leitura de propostas"
                        : "Abrir leitura de propostas"}
                      {aiOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {aiOpen && (
                    <div className="mt-3">
                      <AiUploadPanel
                        context={{
                          condominium: data.condominium,
                          analysisDate: data.analysisDate,
                          recipient: data.recipient,
                          service: data.service,
                          description: data.description,
                          kind: data.kind,
                          category: data.category,
                        }}
                        submitLabel="Mesclar propostas neste mapa"
                        onExtracted={({ mode, draft, files, warnings }) => {
                          updateData((prev) =>
                            mergeComplementary(prev, draft, files, mode)
                          );
                          setAiOpen(false);
                          showToast(
                            "success",
                            warnings[0] ||
                              "Propostas extraídas e mescladas ao mapa. Clique em Salvar para gravar."
                          );
                        }}
                      />
                    </div>
                  )}
                </section>

                {/* SECTION 2: Fornecedores */}
                <section className="card px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-extrabold text-white">
                        2
                      </span>
                      <div>
                        <h2 className="text-[14px] font-extrabold leading-tight text-ink">
                          Fornecedores consultados
                        </h2>
                        <p className="mt-0.5 max-w-xl text-[11.5px] leading-snug text-slate-500">
                          Até 5 propostas. As condições aparecem no documento
                          final.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={data.suppliers.length >= 5}
                      onClick={addSupplier}
                      className="btn btn-ghost"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {data.suppliers.map((sup, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const ranking = summary.rankings.find(
                        (r) => r.supplier.id === sup.id
                      );
                      const isBest = Boolean(ranking?.isBest);
                      return (
                        <div
                          key={sup.id}
                          className={`rounded-xl border p-3 transition ${
                            isBest
                              ? "border-success/30 bg-success-soft/60"
                              : "border-line bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-[10.5px] font-extrabold text-white">
                              {letter}
                            </span>
                            <input
                              value={sup.name}
                              onChange={(e) =>
                                updateSupplier(sup.id, { name: e.target.value })
                              }
                              placeholder={`Fornecedor ${letter}`}
                              className="field min-w-[180px] flex-1 font-semibold"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-right">
                                <span className="label block !text-[8.5px]">
                                  Total
                                </span>
                                <span
                                  className={`text-[13px] font-extrabold tabular-nums ${
                                    isBest ? "text-success" : "text-ink"
                                  }`}
                                >
                                  {formatCurrency(ranking?.total ?? null)}
                                </span>
                              </span>
                              {isBest && (
                                <span className="rounded-full bg-ink px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-brand">
                                  Melhor
                                </span>
                              )}
                              <button
                                type="button"
                                disabled={data.suppliers.length <= 1}
                                onClick={() => removeSupplier(sup.id)}
                                aria-label={`Remover ${sup.name}`}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 grid gap-2 sm:grid-cols-4">
                            <label>
                              <span className="label !text-[8.5px]">
                                Contato
                              </span>
                              <input
                                value={sup.contact}
                                onChange={(e) =>
                                  updateSupplier(sup.id, {
                                    contact: e.target.value,
                                  })
                                }
                                placeholder="e-mail · telefone"
                                className="field mt-0.5 !py-1.5 text-[12px]"
                              />
                            </label>
                            <label>
                              <span className="label !text-[8.5px]">
                                Entrega / execução
                              </span>
                              <input
                                value={sup.deliveryDays}
                                onChange={(e) =>
                                  updateSupplier(sup.id, {
                                    deliveryDays: e.target.value,
                                  })
                                }
                                placeholder="Ex.: 10 dias"
                                className="field mt-0.5 !py-1.5 text-[12px]"
                              />
                            </label>
                            <label>
                              <span className="label !text-[8.5px]">
                                Pagamento
                              </span>
                              <input
                                value={sup.paymentTerms}
                                onChange={(e) =>
                                  updateSupplier(sup.id, {
                                    paymentTerms: e.target.value,
                                  })
                                }
                                placeholder="Ex.: 28 dias"
                                className="field mt-0.5 !py-1.5 text-[12px]"
                              />
                            </label>
                            <label>
                              <span className="label !text-[8.5px]">
                                Validade
                              </span>
                              <input
                                value={sup.validity}
                                onChange={(e) =>
                                  updateSupplier(sup.id, {
                                    validity: e.target.value,
                                  })
                                }
                                placeholder="Ex.: 30 dias"
                                className="field mt-0.5 !py-1.5 text-[12px]"
                              />
                            </label>
                          </div>

                          <label className="mt-2 block">
                            <span className="label !text-[8.5px]">
                              Observações da proposta
                            </span>
                            <input
                              value={sup.notes}
                              onChange={(e) =>
                                updateSupplier(sup.id, { notes: e.target.value })
                              }
                              placeholder="Garantia, impostos inclusos, ART…"
                              className="field mt-0.5 !py-1.5 text-[12px]"
                            />
                          </label>

                          <div className="mt-2">
                            <span className="label !text-[8.5px]">
                              Site / e-commerce do fornecedor
                            </span>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <input
                                value={sup.purchaseUrl ?? ""}
                                onChange={(e) =>
                                  updateSupplier(sup.id, {
                                    purchaseUrl: e.target.value,
                                  })
                                }
                                inputMode="url"
                                placeholder="https://loja-do-fornecedor.com.br"
                                className="field min-w-[180px] flex-1 !py-1.5 text-[11.5px]"
                              />
                              {sup.purchaseUrl?.trim() && (
                                <a
                                  href={
                                    sup.purchaseUrl.startsWith("http")
                                      ? sup.purchaseUrl
                                      : `https://${sup.purchaseUrl}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-dark underline underline-offset-2"
                                >
                                  Abrir
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {sup.purchaseVerified && (
                                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-bold uppercase text-success">
                                  Loja confiável
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-paper/70 px-3 py-2 text-[10.5px]">
                            <div>
                              <span className="block text-slate-500">
                                Mão de obra
                              </span>
                              <strong className="text-ink">
                                {formatCurrency(
                                  ranking?.breakdown.mao_obra.total ?? null
                                )}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-slate-500">
                                Material
                              </span>
                              <strong className="text-ink">
                                {formatCurrency(
                                  ranking?.breakdown.material.total ?? null
                                )}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-slate-500">
                                Não discriminado
                              </span>
                              <strong className="text-ink">
                                {formatCurrency(
                                  ranking?.breakdown.nao_discriminado.total ??
                                    null
                                )}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* SECTION 3: Produtos / Itens e valores */}
                <section className="card px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-extrabold text-white">
                        3
                      </span>
                      <div>
                        <h2 className="text-[14px] font-extrabold leading-tight text-ink">
                          {data.kind === "produtos"
                            ? "Produtos e valores"
                            : "Serviços e valores"}
                        </h2>
                        <p className="mt-0.5 max-w-xl text-[11.5px] leading-snug text-slate-500">
                          Classifique cada item como mão de obra, material ou
                          não discriminado e informe os preços unitários.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="btn btn-ghost"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar item
                    </button>
                  </div>

                  <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1">
                    <table className="w-full min-w-[880px] border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 w-[32%] rounded-tl-lg bg-paper px-2 py-2 text-left text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-500">
                            Item / descrição
                          </th>
                          <th className="w-[62px] bg-paper px-1 py-2 text-center text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-500">
                            Qtd
                          </th>
                          <th className="w-[96px] bg-paper px-1.5 py-2 text-left text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-500">
                            Un.
                          </th>
                          {data.suppliers.map((sup, idx) => (
                            <th
                              key={sup.id}
                              className="w-[138px] bg-paper px-1.5 py-2 text-right text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-slate-500"
                            >
                              <span
                                className="block truncate"
                                title={sup.name}
                              >
                                {String.fromCharCode(65 + idx)} ·{" "}
                                {sup.name || "Fornecedor"}
                              </span>
                              <span className="text-[8.5px] font-semibold normal-case tracking-normal text-slate-400">
                                valor unit.
                              </span>
                            </th>
                          ))}
                          <th className="w-[34px] rounded-tr-lg bg-paper px-1 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((item, idx) => {
                          const lowest = lowestPriceForItem(
                            item,
                            data.suppliers
                          );
                          return (
                            <tr key={item.id} className="align-top">
                              <td className="border-b border-line px-2 py-1.5">
                                <div className="flex items-start gap-1.5">
                                  <span className="mt-2 text-[9.5px] font-bold text-slate-400">
                                    {String(idx + 1).padStart(2, "0")}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <textarea
                                      rows={2}
                                      value={item.description}
                                      onChange={(e) =>
                                        updateItem(item.id, {
                                          description: e.target.value,
                                        })
                                      }
                                      placeholder="Descrição do item, material ou serviço"
                                      className="field resize-none !py-1.5 text-[12px]"
                                    />
                                    <select
                                      aria-label={`Tipo de custo do item ${
                                        idx + 1
                                      }`}
                                      value={
                                        item.costType ?? "nao_discriminado"
                                      }
                                      onChange={(e) =>
                                        updateItem(item.id, {
                                          costType: e.target.value as CostType,
                                        })
                                      }
                                      className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1 text-[10.5px] font-semibold text-slate-600 outline-none focus:border-brand"
                                    >
                                      <option value="mao_obra">
                                        Mão de obra
                                      </option>
                                      <option value="material">Material</option>
                                      <option value="nao_discriminado">
                                        Não discriminado
                                      </option>
                                    </select>
                                  </div>
                                </div>
                              </td>

                              <td className="border-b border-line px-1 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item.quantity}
                                  aria-label={`Quantidade do item ${idx + 1}`}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      quantity: Math.max(
                                        0,
                                        Number(e.target.value) || 0
                                      ),
                                    })
                                  }
                                  className="field !h-8 w-full min-w-0 !px-1 !py-1 text-center text-[11px] font-semibold tabular-nums"
                                />
                              </td>

                              <td className="border-b border-line px-1.5 py-1.5">
                                <select
                                  value={item.unit}
                                  aria-label={`Unidade do item ${idx + 1}`}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      unit: e.target.value,
                                    })
                                  }
                                  className="field !h-8 w-full min-w-0 !py-1 text-[11px]"
                                >
                                  {UNITS.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {data.suppliers.map((sup) => {
                                const price = item.prices?.[sup.id] ?? null;
                                const isBestCell =
                                  price !== null &&
                                  lowest !== null &&
                                  Math.abs(price - lowest) < 0.005;
                                return (
                                  <td
                                    key={sup.id}
                                    className="border-b border-line px-1.5 py-1.5"
                                  >
                                    <CurrencyInput
                                      value={price}
                                      highlightBest={isBestCell}
                                      ariaLabel={`Valor unitário ${sup.name} item ${
                                        idx + 1
                                      }`}
                                      onChange={(val) =>
                                        updateItemPrice(item.id, sup.id, val)
                                      }
                                    />
                                  </td>
                                );
                              })}

                              <td className="border-b border-line px-1 py-1.5 text-center">
                                <button
                                  type="button"
                                  disabled={data.items.length <= 1}
                                  onClick={() => removeItem(item.id)}
                                  aria-label="Remover item"
                                  className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        <tr>
                          <td
                            colSpan={3}
                            className="bg-paper px-2 py-2 text-right text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500"
                          >
                            Total por fornecedor
                          </td>
                          {data.suppliers.map((sup) => {
                            const ranking = summary.rankings.find(
                              (r) => r.supplier.id === sup.id
                            );
                            return (
                              <td
                                key={sup.id}
                                className={`bg-paper px-1.5 py-2 text-right text-[12px] font-extrabold tabular-nums ${
                                  ranking?.isBest ? "text-success" : "text-ink"
                                }`}
                              >
                                {formatCurrency(ranking?.total ?? null)}
                              </td>
                            );
                          })}
                          <td className="bg-paper" />
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-2 text-[10.5px] text-slate-500">
                    Totais calculados por quantidade × valor unitário. Itens sem
                    preço não entram no total; melhor proposta e economia
                    consideram apenas fornecedores com todos os itens cotados.
                  </p>

                  {/* Links de compra dos produtos */}
                  <div className="mt-3 rounded-xl border border-line bg-paper/40 px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-extrabold text-ink">
                          Links de compra dos produtos
                        </p>
                        <p className="mt-0.5 max-w-md text-[10.5px] leading-snug text-slate-500">
                          Opcional. A IA preenche quando o link aparece no
                          documento ou na pesquisa em lojas confiáveis. Você
                          também pode colar o endereço manualmente.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={searchingItems}
                        onClick={handleSearchMapItems}
                        className="btn btn-ghost !py-1.5"
                      >
                        {searchingItems ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                        Pesquisar itens do mapa
                      </button>
                    </div>

                    <ProductSearchPanel
                      condominium={data.condominium}
                      onAddItem={handleAddSearchedProduct}
                    />

                    <ul className="mt-2.5 space-y-2.5">
                      {data.items.map((item, idx) => (
                        <li key={item.id}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="w-6 shrink-0 text-[9.5px] font-bold text-slate-400">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink"
                              title={item.description}
                            >
                              {item.description || `Item ${idx + 1}`}
                            </span>
                            {item.purchaseVerified && (
                              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-success">
                                Loja confiável
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-7">
                            <input
                              value={item.purchaseUrl ?? ""}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  purchaseUrl: e.target.value,
                                })
                              }
                              inputMode="url"
                              placeholder="https://loja.com.br/produto"
                              className="field min-w-[200px] flex-1 !py-1.5 text-[11px]"
                            />
                            {item.purchaseUrl?.trim() && (
                              <a
                                href={
                                  item.purchaseUrl.startsWith("http")
                                    ? item.purchaseUrl
                                    : `https://${item.purchaseUrl}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-brand-dark underline underline-offset-2"
                              >
                                Abrir <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {item.purchasePrice != null && (
                              <span className="text-[10px] font-bold text-ink">
                                {formatCurrency(item.purchasePrice)}
                              </span>
                            )}
                            {item.purchaseStore && (
                              <span className="text-[10px] text-slate-500">
                                {item.purchaseStore}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* SECTION 4: Análise técnica */}
                <section className="card px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-extrabold text-white">
                        4
                      </span>
                      <div>
                        <h2 className="text-[14px] font-extrabold leading-tight text-ink">
                          Análise técnica e recomendação
                        </h2>
                        <p className="mt-0.5 max-w-xl text-[11.5px] leading-snug text-slate-500">
                          Texto editável. A IA redige um parecer inicial e você
                          pode ajustar.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRecalculateAnalysis}
                      className="btn btn-ghost"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Gerar análise
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-2">
                      <label className="block">
                        <span className="label">Resumo comparativo</span>
                        <textarea
                          rows={5}
                          value={data.analysis.summary}
                          onChange={(e) =>
                            updateData((prev) => ({
                              ...prev,
                              analysis: {
                                ...prev.analysis,
                                summary: e.target.value,
                              },
                            }))
                          }
                          placeholder="Resumo das propostas analisadas, cobertura e diferenças de valor."
                          className="field mt-1 resize-y text-[12.5px] leading-relaxed"
                        />
                      </label>

                      <label className="block">
                        <span className="label">Recomendação</span>
                        <textarea
                          rows={3}
                          value={data.analysis.recommendation}
                          onChange={(e) =>
                            updateData((prev) => ({
                              ...prev,
                              analysis: {
                                ...prev.analysis,
                                recommendation: e.target.value,
                              },
                            }))
                          }
                          placeholder="Fornecedor recomendado e condicionantes."
                          className="field mt-1 resize-y text-[12.5px] leading-relaxed"
                        />
                      </label>

                      <label className="block">
                        <span className="label">Observações e aprovação</span>
                        <textarea
                          rows={2}
                          value={data.analysis.notes}
                          onChange={(e) =>
                            updateData((prev) => ({
                              ...prev,
                              analysis: {
                                ...prev.analysis,
                                notes: e.target.value,
                              },
                            }))
                          }
                          placeholder="Registro de aprovação, atas, ressalvas."
                          className="field mt-1 resize-y text-[12.5px] leading-relaxed"
                        />
                      </label>
                    </div>

                    <div className="rounded-xl border border-line bg-[#fbfdfc] p-3">
                      <p className="label !text-[8.5px]">Melhor proposta</p>
                      <p className="mt-0.5 text-[13px] font-extrabold leading-tight text-ink">
                        {summary.best?.supplier.name || "—"}
                      </p>
                      <p className="font-display mt-1 text-[22px] leading-none text-success">
                        {formatCurrency(summary.best?.total ?? null)}
                      </p>

                      <div className="mt-3 space-y-2.5 border-t border-line pt-3">
                        {summary.rankings.map((r) => (
                          <div key={r.supplier.id}>
                            <div className="flex justify-between gap-2 text-[10.5px]">
                              <span className="truncate font-bold text-ink">
                                {r.supplier.name || "Fornecedor"}
                              </span>
                              <span
                                className={`shrink-0 font-extrabold tabular-nums ${
                                  r.isBest ? "text-success" : "text-slate-600"
                                }`}
                              >
                                {formatCurrency(r.total)}
                              </span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-line">
                              <div
                                className={`h-full rounded-full ${
                                  r.isBest ? "bg-success" : "bg-ink/30"
                                }`}
                                style={{
                                  width:
                                    r.total && r.total > 0
                                      ? `${Math.max(
                                          6,
                                          (r.total / maxTotal) * 100
                                        )}%`
                                      : "0%",
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 5: Resultado da contratação */}
                <section className="card px-4 py-4 sm:px-5">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-extrabold text-white">
                      5
                    </span>
                    <div>
                      <h2 className="text-[14px] font-extrabold leading-tight text-ink">
                        Resultado da contratação
                      </h2>
                      <p className="mt-0.5 max-w-xl text-[11.5px] leading-snug text-slate-500">
                        Registre a referência e o valor aprovado para acompanhar
                        a economia confirmada no dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="sm:col-span-3">
                      <span className="label">Fornecedor contratado</span>
                      <select
                        value={outcome.supplierId}
                        onChange={(e) =>
                          updateOutcome({
                            supplierId: e.target.value,
                            contractedAmount: null,
                          })
                        }
                        className="field mt-1"
                      >
                        <option value="">
                          Selecione quando houver contratação
                        </option>
                        {data.suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name || "Fornecedor sem nome"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div>
                      <span className="label">Valor de referência</span>
                      <div className="mt-1">
                        <CurrencyInput
                          value={outcome.referenceAmount}
                          onChange={(val) =>
                            updateOutcome({ referenceAmount: val })
                          }
                          ariaLabel="Valor de referência"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={summary.highest?.total == null}
                        onClick={() =>
                          updateOutcome({
                            referenceAmount: summary.highest?.total ?? null,
                          })
                        }
                        className="mt-1 text-[10px] font-bold text-brand-dark underline disabled:opacity-40"
                      >
                        Usar maior proposta completa
                      </button>
                    </div>

                    <div>
                      <span className="label">Valor contratado</span>
                      <div className="mt-1">
                        <CurrencyInput
                          value={outcome.contractedAmount}
                          onChange={(val) =>
                            updateOutcome({ contractedAmount: val })
                          }
                          ariaLabel="Valor contratado"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={
                          !selectedOutcomeRanking ||
                          selectedOutcomeRanking.total === null
                        }
                        onClick={() =>
                          updateOutcome({
                            contractedAmount:
                              selectedOutcomeRanking?.total ?? null,
                          })
                        }
                        className="mt-1 text-[10px] font-bold text-brand-dark underline disabled:opacity-40"
                      >
                        Usar total do fornecedor
                      </button>
                    </div>

                    <div className="rounded-lg border border-line bg-paper px-3 py-2">
                      <span className="label">Diferença confirmada</span>
                      <p
                        className={`mt-1 text-[15px] font-extrabold tabular-nums ${
                          liveOutcomeDiff !== null && liveOutcomeDiff < 0
                            ? "text-red-700"
                            : "text-success"
                        }`}
                      >
                        {formatCurrency(liveOutcomeDiff)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {liveOutcomeDiff !== null && liveOutcomeDiff < 0
                          ? "Acima da referência"
                          : "Referência − contratado"}
                      </p>
                    </div>

                    <label className="flex items-start gap-2 sm:col-span-3">
                      <input
                        type="checkbox"
                        checked={outcome.confirmed}
                        onChange={(e) =>
                          updateOutcome({ confirmed: e.target.checked })
                        }
                        className="mt-0.5 h-4 w-4 accent-[#181447]"
                      />
                      <span className="text-[11.5px] leading-relaxed text-slate-600">
                        Confirmo os valores da contratação. Para entrar no
                        indicador confirmado, informe os dois valores, selecione
                        o fornecedor e marque o mapa como{" "}
                        <strong className="text-ink">Concluído</strong>.
                        {recordedSavings(data) !== null && (
                          <span className="ml-2 inline-flex rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                            Entrando nos indicadores confirmados
                          </span>
                        )}
                      </span>
                    </label>
                  </div>
                </section>

                {/* Anexos registrados */}
                {data.attachments.length > 0 && (
                  <section className="card px-4 py-3.5 sm:px-5">
                    <p className="label !text-[8.5px]">
                      Propostas anexadas ao processo ({data.attachments.length})
                    </p>
                    <ul className="mt-2 divide-y divide-line">
                      {data.attachments.map((att, idx) => (
                        <li
                          key={`${att.name}-${idx}`}
                          className="flex items-center justify-between gap-2 py-2 text-[11.5px]"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-brand-dark" />
                            <span className="truncate font-bold text-ink">
                              {att.name}
                            </span>
                            <span className="rounded-full bg-paper px-2 py-0.5 text-[9.5px] font-bold text-slate-500">
                              {att.source === "ia" ? "Lido por IA" : "Manual"}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateData((prev) => ({
                                ...prev,
                                attachments: prev.attachments.filter(
                                  (_, i) => i !== idx
                                ),
                              }))
                            }
                            className="text-[10.5px] font-bold text-slate-400 hover:text-red-600"
                          >
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Sticky Right Sidebar */}
              <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <section className="card overflow-hidden">
                  <div className="bg-ink px-4 py-3 text-white">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/60">
                      Resumo do comparativo
                    </p>
                    <p className="font-display mt-0.5 text-[19px] leading-tight">
                      {summary.best?.supplier.name || "Aguardando valores"}
                    </p>
                    <p className="mt-1 text-[22px] font-extrabold leading-none tabular-nums">
                      {formatCurrency(summary.best?.total ?? null)}
                    </p>
                    <p className="mt-1 text-[10px] text-white/60">
                      {summary.best?.isComplete
                        ? "Menor proposta com cobertura completa"
                        : "Cobertura parcial — complete os preços"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
                    <div className="px-3 py-2.5">
                      <p className="label !text-[8px]">Economia</p>
                      <p className="text-[13px] font-extrabold text-success tabular-nums">
                        {summary.isComparable
                          ? formatCurrency(summary.savings)
                          : "—"}
                      </p>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="label !text-[8px]">Redução</p>
                      <p className="text-[13px] font-extrabold text-success tabular-nums">
                        {summary.isComparable
                          ? `${summary.savingsPercent.toFixed(1)}%`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="border-b border-line px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="label !text-[8px]">
                        Valores por fornecedor
                      </p>
                      <span className="text-[9px] text-slate-400">
                        Atualização imediata
                      </span>
                    </div>
                    <div className="mt-2 space-y-2.5">
                      {summary.rankings.map((r) => (
                        <div
                          key={r.supplier.id}
                          className="rounded-lg bg-paper/70 px-2.5 py-2"
                        >
                          <div className="flex justify-between gap-2 text-[10.5px]">
                            <span className="truncate font-bold text-ink">
                              {r.supplier.name || "Fornecedor"}
                            </span>
                            <strong
                              className={`tabular-nums ${
                                r.isBest ? "text-success" : "text-ink"
                              }`}
                            >
                              {formatCurrency(r.total)}
                            </strong>
                          </div>
                          <p className="mt-0.5 text-[9.5px] text-slate-500">
                            {r.coverage}/{summary.itemCount} itens cotados
                          </p>
                          <p className="mt-1 text-[9.5px] leading-relaxed text-slate-500">
                            Mão de obra:{" "}
                            {formatCurrency(r.breakdown.mao_obra.total)} ·
                            Material:{" "}
                            {formatCurrency(r.breakdown.material.total)} · Não
                            discriminado:{" "}
                            {formatCurrency(
                              r.breakdown.nao_discriminado.total
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    <p className="label !text-[8px]">Pendências para concluir</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {checklist.map((item) => (
                        <li
                          key={item.label}
                          className="flex items-start gap-1.5 text-[11px] leading-snug"
                        >
                          {item.done ? (
                            <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                              <span className="text-[8px] font-black">!</span>
                            </span>
                          )}
                          <span
                            className={
                              item.done
                                ? "text-slate-500 line-through decoration-slate-300"
                                : "font-semibold text-ink"
                            }
                          >
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="card px-4 py-3.5">
                  <p className="label !text-[8.5px]">Ações do processo</p>
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => setPreviewMode(true)}
                      className="btn btn-ghost w-full !justify-start"
                    >
                      <Eye className="h-4 w-4" />
                      Pré-visualizar documento
                    </button>
                    <button
                      type="button"
                      disabled={downloadingPdf}
                      onClick={handleDownloadPdf}
                      className="btn btn-brand w-full !justify-start"
                    >
                      {downloadingPdf ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Baixar PDF do mapa
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn btn-ghost w-full !justify-start"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir no navegador
                    </button>
                    <button
                      type="button"
                      onClick={handleRecalculateAnalysis}
                      className="btn btn-ghost w-full !justify-start"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Recalcular análise
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDelete}
                      className="btn w-full !justify-start text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleting ? "Excluindo…" : "Excluir mapa"}
                    </button>
                  </div>
                </section>

                <section className="rounded-xl border border-brand/20 bg-brand-soft/60 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-dark">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Padrão Gerencial
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">
                    Este mapa segue o modelo institucional da Gerencial:
                    identificação, comparativo, condições comerciais, parecer
                    técnico e aprovação — pronto para anexar ao processo do
                    condomínio.
                  </p>
                </section>
              </aside>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
