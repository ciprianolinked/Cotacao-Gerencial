"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { formatSize } from "@/lib/calculations";
import type { QuotationData } from "@/lib/types";

interface AiUploadPanelProps {
  context: {
    condominium?: string;
    analysisDate?: string;
    recipient?: string;
    service?: string;
    description?: string;
    kind?: "servico" | "produtos";
    category?: string;
  };
  submitLabel?: string;
  onExtracted: (payload: {
    mode: "ia" | "manual";
    draft: QuotationData;
    files: { name: string; size: number; type: string }[];
    warnings: string[];
  }) => void | Promise<void>;
}

export function AiUploadPanel({
  context,
  submitLabel = "Analisar propostas e gerar mapa",
  onExtracted,
}: AiUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [showPaste, setShowPaste] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [searchProducts, setSearchProducts] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{
    checked: boolean;
    configured: boolean;
    model: string;
  }>({ checked: false, configured: false, model: "" });

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) =>
        setAiStatus({
          checked: true,
          configured: Boolean(d.configured),
          model: d.model || "",
        })
      )
      .catch(() =>
        setAiStatus({ checked: true, configured: false, model: "" })
      );
  }, []);

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of arr) {
        if (merged.length >= 6) break;
        if (!merged.some((e) => e.name === f.name && e.size === f.size)) {
          merged.push(f);
        }
      }
      return merged;
    });
    setError(null);
  };

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  async function handleAnalyze() {
    if (files.length === 0 && !pastedText.trim()) {
      setError(
        "Selecione ao menos uma proposta (PDF/imagem) ou cole o texto das cotações."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("pastedText", pastedText);
      fd.append("searchProducts", String(searchProducts));
      fd.append("context", JSON.stringify(context));

      const res = await fetch("/api/ai/extract", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Falha ao analisar propostas.");
      }

      await onExtracted({
        mode: json.mode === "ia" ? "ia" : "manual",
        draft: json.draft,
        files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        warnings: json.warnings ?? [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao processar os documentos."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card overflow-hidden ring-1 ring-brand/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-brand-soft/80 via-white to-white px-4 py-3.5 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-brand shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-extrabold leading-tight text-ink">
              Envie as propostas e deixe a IA elaborar o mapa
            </h2>
            <p className="mt-0.5 max-w-md text-[12px] leading-snug text-slate-500">
              Envie as propostas em PDF ou imagem. A IA gratuita identifica
              fornecedores, itens e valores e monta o mapa comparativo pronto
              para revisão.
            </p>
          </div>
        </div>

        {!aiStatus.checked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            Verificando IA…
          </span>
        ) : aiStatus.configured ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-bold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Gemini ativo
          </span>
        ) : (
          <Link
            href="/configuracoes"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Configurar IA grátis
          </Link>
        )}
      </div>

      <div className="px-4 py-4 sm:px-5">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition ${
            dragging
              ? "border-brand-dark bg-brand-soft/70"
              : "border-[#cfc9ae] bg-[#fffdf6] hover:border-brand-dark/70 hover:bg-brand-soft/50"
          }`}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-brand shadow-sm">
            <Upload className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[13px] font-bold text-ink">
            Arraste aqui as propostas dos fornecedores
          </p>
          <p className="mt-1 text-[11.5px] text-slate-500">
            PDF, JPG, PNG ou WEBP · até 6 arquivos · até 12 MB no total por envio
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-ink ring-1 ring-line">
            Selecionar arquivos
          </span>
        </div>

        {files.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {files.map((file, idx) => (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-paper/50 px-3 py-2 text-[11.5px]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-brand-dark" />
                  <span className="truncate font-bold text-ink">{file.name}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {formatSize(file.size)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remover ${file.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            <li className="text-right text-[10px] text-slate-500">
              {files.length} arquivo(s) · {formatSize(totalBytes)} no total
            </li>
          </ul>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowPaste((v) => !v)}
            className="text-[11.5px] font-bold text-ink underline decoration-brand decoration-2 underline-offset-2 hover:decoration-brand-dark"
          >
            {showPaste
              ? "Ocultar campo de texto colado"
              : "Ou cole o texto da cotação (funciona sem IA)"}
          </button>
        </div>

        {showPaste && (
          <div className="mt-2.5">
            <textarea
              rows={5}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="field resize-y text-[12px]"
              placeholder={
                "Exemplo (uma proposta por linha ou blocos):\nFornecedor: Empresa Alpha\nPrazo: 10 dias úteis\nPagamento: 30 dias boleto\n2 un Arandela Solar Intelbras - R$ 304,18\n\nFornecedor: Empresa Beta - R$ 914,10"
              }
            />
          </div>
        )}

        <div className="mt-3 space-y-2 rounded-xl border border-line bg-paper/50 px-3 py-2.5">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={searchProducts}
              onChange={(e) => setSearchProducts(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#181447]"
            />
            <span className="text-[11.5px] leading-snug text-slate-600">
              <strong className="text-ink">
                Pesquisar produtos e links de compra em lojas confiáveis
              </strong>{" "}
              (opcional). A IA usa a busca do Google restrita a lojas conhecidas
              de materiais e ferragens. Pode deixar desmarcado para analisar
              apenas os documentos enviados.
            </span>
          </label>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-2 text-[12px] font-semibold leading-snug text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <p className="mt-1.5 pl-6 text-[10.5px] leading-snug text-red-600">
              O sistema já tentou automaticamente os modelos{" "}
              <strong>gemini-4-hydrogen</strong> e{" "}
              <strong>gemini-3.5-flash-lite</strong> antes de falhar. Seus
              arquivos continuam selecionados — você pode tentar novamente
              sem perdê-los.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-6">
              <a
                href="https://status.cloud.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-red-700 transition hover:bg-red-100"
              >
                Status do Google
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://aistudio.google.com/rate-limits"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-red-700 transition hover:bg-red-100"
              >
                Verificar cota
                <ExternalLink className="h-3 w-3" />
              </a>
              <Link
                href="/ajuda/ia"
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-red-700 transition hover:bg-red-100"
              >
                Ver ajuda
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-sm text-[10.5px] leading-snug text-slate-500">
            Sem a IA ativada, use o texto colado ou preencha manualmente.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={handleAnalyze}
            className="btn btn-brand"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando propostas…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
