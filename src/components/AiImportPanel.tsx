"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AiExtractionResult } from "@/lib/types";
import { formatBytes } from "@/lib/quotation";
import { MAX_FILES } from "@/lib/constants";
import { CheckIcon, CloseIcon, FileIcon, SparklesIcon, UploadIcon } from "./icons";

export type AiFileMeta = { name: string; size: number; type: string };

type AiStatus = {
  connected: boolean;
  provider: "gemini" | "openai" | "none";
  model: string;
  label: string;
  setupUrl: string;
  guideUrl: string;
  maxTotalUploadBytes?: number | null;
};

type AiImportPanelProps = {
  hints: { condominium?: string; service?: string; recipient?: string; description?: string };
  onApply: (result: AiExtractionResult, files: AiFileMeta[]) => void;
  variant?: "hero" | "embedded";
  title?: string;
  ctaLabel?: string;
};

const STAGES = [
  "Lendo os documentos enviados…",
  "Identificando fornecedores e propostas…",
  "Extraindo itens, quantidades e valores…",
  "Comparando preços e cobertura…",
  "Redigindo o parecer técnico…",
];

export function AiImportPanel({
  hints,
  onApply,
  variant = "embedded",
  title = "Leitura inteligente de propostas",
  ctaLabel = "Analisar com IA",
}: AiImportPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [showText, setShowText] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiExtractionResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/ai/status")
      .then((response) => response.json())
      .then((data: AiStatus) => {
        if (active) setStatus(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setStage((current) => (current + 1) % STAGES.length), 2400);
    return () => clearInterval(timer);
  }, [loading]);

  function addFiles(incoming: FileList | File[]) {
    const next = Array.from(incoming).filter((file) => {
      const okType = file.type === "application/pdf" || file.type.startsWith("image/");
      return okType && file.size <= 15 * 1024 * 1024;
    });
    setError(
      next.length === 0
        ? "Formato não suportado ou arquivo acima de 15 MB. Envie PDF, JPG, PNG ou WEBP."
        : null,
    );
    setFiles((current) => {
      const merged = [...current];
      for (const file of next) {
        if (!merged.some((entry) => entry.name === file.name && entry.size === file.size)) merged.push(file);
      }
      return merged.slice(0, MAX_FILES);
    });
    setResult(null);
    setApplied(false);
  }

  async function analyze() {
    if (files.length === 0 && !text.trim()) {
      setError("Envie os arquivos das propostas ou cole o texto da cotação para analisar.");
      return;
    }
    if (status?.maxTotalUploadBytes) {
      const textBytes = new TextEncoder().encode(text + JSON.stringify(hints)).byteLength;
      const total = files.reduce((sum, file) => sum + file.size, 0) + textBytes + 16 * 1024;
      if (total > status.maxTotalUploadBytes) {
        setError("Na Vercel, o limite é de aproximadamente 4 MB por envio, somando todos os arquivos e o texto. Reduza ou divida os documentos e tente novamente.");
        return;
      }
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setStage(0);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      form.append("text", text);
      form.append("hints", JSON.stringify(hints));
      const response = await fetch("/api/ai/extract", { method: "POST", body: form });
      if (response.status === 413) {
        throw new Error("O envio ultrapassou o limite do servidor. Na Vercel, reduza o total dos arquivos para menos de 4 MB e tente novamente.");
      }
      const data = (await response.json()) as AiExtractionResult & { error?: string };
      if (!response.ok || data.error) throw new Error(data.error || "Não foi possível analisar os documentos.");
      setResult(data);
      setApplied(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro inesperado na análise.");
    } finally {
      setLoading(false);
    }
  }

  function apply() {
    if (!result) return;
    onApply(result, files.map((file) => ({ name: file.name, size: file.size, type: file.type || "application/pdf" })));
    setApplied(true);
  }

  const modeLabel = result?.mode === "ia" ? "Análise concluída pela IA" : "Pré-análise local (texto)";
  const showSetupHint = error !== null && /configurar ia|chave/i.test(error);

  return (
    <section className={`card overflow-hidden ${variant === "hero" ? "ring-1 ring-brand/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-brand-soft/80 via-white to-white px-4 py-3.5 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-ink text-brand shadow-sm">
            <SparklesIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[15px] font-extrabold leading-tight text-ink">{title}</h2>
            <p className="mt-0.5 max-w-md text-[12px] leading-snug text-slate-500">
              Envie as propostas em PDF ou imagem. A IA gratuita identifica fornecedores, itens e valores e monta o
              mapa comparativo pronto para revisão.
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            status?.connected ? "bg-success-soft text-success" : "bg-amber-50 text-amber-700"
          }`}
          title={status?.label}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status?.connected ? "bg-success" : "bg-amber-500"}`} />
          {status ? status.label : "Verificando IA…"}
        </span>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {status && !status.connected && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/40 bg-brand-soft px-3 py-2.5">
            <p className="max-w-md text-[11.5px] leading-snug text-ink">
              <span className="font-extrabold">IA ainda não ativada.</span> Ative a leitura automática de PDFs e fotos
              em 2 minutos — é grátis, com sua conta Google.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/ajuda/ia" className="btn btn-ghost !py-1.5">
                Passo a passo
              </Link>
              <Link href="/configuracoes" className="btn btn-brand !py-1.5">
                <SparklesIcon className="h-3.5 w-3.5" />
                Ativar IA grátis
              </Link>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files) addFiles(event.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition ${
            dragging ? "border-brand-dark bg-brand-soft" : "border-[#cfc9ae] bg-[#fffdf6] hover:border-brand-dark/70 hover:bg-brand-soft/50"
          }`}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-brand shadow-sm">
            <UploadIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[13px] font-bold text-ink">Arraste aqui as propostas dos fornecedores</p>
          <p className="mt-1 text-[11.5px] text-slate-500">
            PDF, JPG, PNG ou WEBP · até {MAX_FILES} arquivos · {status?.maxTotalUploadBytes ? "até 4 MB no total por envio" : "15 MB por arquivo"}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-ink ring-1 ring-line">
            Selecionar arquivos
          </span>
        </div>

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((file) => (
              <li
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-2.5 py-2"
              >
                <FileIcon className="h-4 w-4 shrink-0 text-brand-dark" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">{file.name}</span>
                <span className="text-[10.5px] text-slate-500">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  aria-label={`Remover ${file.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setFiles((current) => current.filter((entry) => entry !== file));
                  }}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowText((current) => !current)}
            className="text-[11.5px] font-bold text-ink underline decoration-brand decoration-2 underline-offset-2 hover:decoration-brand-dark"
          >
            {showText ? "Ocultar texto da cotação" : "Ou cole o texto da cotação (funciona sem IA)"}
          </button>
          {showText && (
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              placeholder={"Cole aqui o conteúdo da proposta ou do orçamento.\nEx.: Fornecedor: HidroLuz Materiais Ltda.\nTubo PVC 25mm — 20 un — R$ 89,90"}
              className="field mt-2 resize-y font-mono text-[11.5px]"
            />
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[12px] font-semibold leading-snug text-red-700">{error}</p>
            {showSetupHint && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href="/configuracoes" className="btn btn-brand !py-1.5">
                  Configurar IA agora
                </Link>
                <Link href="/ajuda/ia" className="btn btn-ghost !py-1.5">
                  Ver passo a passo
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-sm text-[10.5px] leading-snug text-slate-500">
            {status?.connected
              ? "Os arquivos são enviados ao provedor de IA configurado. Verifique os termos de privacidade antes de enviar dados reais."
              : "Sem a IA ativada, use o texto colado ou preencha manualmente — nada de exemplo é criado."}
          </p>
          <button type="button" onClick={analyze} disabled={loading} className="btn btn-brand">
            <SparklesIcon className={loading ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
            {loading ? STAGES[stage] : ctaLabel}
          </button>
        </div>

        {loading && (
          <div className="mt-3 overflow-hidden rounded-lg border border-brand/30 bg-brand-soft/70 px-3 py-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-brand-dark">
              Analisando as propostas — isso pode levar alguns segundos.
            </p>
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-xl border border-line bg-[#fffdf6] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-success">
                <CheckIcon className="h-3 w-3" />
                {modeLabel}
              </span>
              <span className="text-[10.5px] font-semibold text-slate-500">{result.provider}</span>
            </div>
            <p className="mt-2 text-[12px] leading-snug text-slate-600">
              {result.draft.suppliers.length} fornecedor(es) · {result.draft.items.length} item(ns) identificados
              {result.draft.condominium ? ` · ${result.draft.condominium}` : ""}
            </p>
            {result.warnings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {result.warnings.map((warning) => (
                  <li key={warning} className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-800">
                    {warning}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={apply} className="btn btn-primary" disabled={applied}>
                <CheckIcon className="h-4 w-4" />
                {applied ? "Dados aplicados ao mapa" : "Aplicar dados ao mapa"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setFiles([]);
                  setText("");
                }}
                className="btn btn-ghost"
              >
                Limpar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
