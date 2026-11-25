"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { SELECTABLE_MODELS } from "@/lib/gemini";
import { safeJson } from "@/lib/http";

interface AiConfigClientProps {
  initialStatus: {
    configured: boolean;
    source: "env" | "db" | "none";
    maskedKey: string | null;
    model: string;
  };
}

export function AiConfigClient({ initialStatus }: AiConfigClientProps) {
  const [status, setStatus] = useState(initialStatus);
  const [selectedModel, setSelectedModel] = useState(
    initialStatus.model || "gemini-3.5-flash-lite"
  );
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSaveAndTest() {
    if (!apiKey.trim() && !status.configured) {
      setFeedback({
        type: "error",
        text: "Cole sua chave de API do Google Gemini no campo acima.",
      });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: selectedModel,
        }),
      });
      const json = await safeJson<{
        error?: string;
        source?: "env" | "db" | "none";
        maskedKey?: string | null;
        model?: string;
        message?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error || "Chave rejeitada.");
      setStatus({
        configured: true,
        source: json.source ?? "db",
        maskedKey: json.maskedKey ?? status.maskedKey,
        model: json.model ?? selectedModel,
      });
      if (json.model) setSelectedModel(json.model);
      setApiKey("");
      setFeedback({
        type: "success",
        text: json.message || "Chave salva e conexão confirmada com sucesso!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Não foi possível validar a chave.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/ai/config", { method: "PUT" });
      const json = await safeJson<{
        error?: string;
        model?: string;
        message?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error || "Falha no teste de conexão.");
      if (json.model) {
        setStatus((prev) => ({ ...prev, model: json.model! }));
        setSelectedModel(json.model);
      }
      setFeedback({
        type: "success",
        text: json.message || "Conexão com o Google Gemini funcionando.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Não foi possível conectar ao Gemini.",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleRemoveKey() {
    if (!window.confirm("Remover a chave Gemini salva no painel?")) return;
    setRemoving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/ai/config", { method: "DELETE" });
      const json = await safeJson<{
        error?: string;
        configured?: boolean;
        source?: "env" | "db" | "none";
        maskedKey?: string | null;
        model?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error || "Erro ao remover chave.");
      setStatus({
        configured: Boolean(json.configured),
        source: json.source ?? "none",
        maskedKey: json.maskedKey ?? null,
        model: json.model ?? selectedModel,
      });
      setFeedback({
        type: "success",
        text: "Chave removida do banco do aplicativo.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao remover chave.",
      });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <main className="mx-auto max-w-[980px] px-4 pb-16 pt-5 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Painel de cotações
      </Link>

      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-tight text-ink sm:text-[34px]">
            Configurar IA gratuita
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-slate-500">
            Conecte o Google Gemini — a IA gratuita que lê seus PDFs e fotos de
            propostas e monta o mapa de cotação sozinha. Sem código, sem cartão,
            em cerca de 2 minutos.
          </p>
        </div>

        <Link
          href="/ajuda/ia"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[10.5px] font-bold text-brand transition hover:bg-ink-soft"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Passo a passo ilustrado
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="bg-ink px-4 py-3.5 text-white sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-ink-deep">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-extrabold leading-tight">
                      {status.configured
                        ? "IA configurada"
                        : "IA ainda não configurada"}
                    </h2>
                    <p className="text-[11.5px] text-white/65">
                      {status.configured
                        ? `Google Gemini · ${status.model} · ${
                            status.source === "env"
                              ? "variável de ambiente"
                              : "chave salva no painel"
                          } · ${status.maskedKey}`
                        : "Cole uma chave gratuita do Google AI Studio para ativar a leitura de PDFs e imagens."}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    status.configured
                      ? "bg-brand text-ink-deep"
                      : "bg-white/15 text-white"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      status.configured ? "bg-ink-deep" : "bg-amber-300"
                    }`}
                  />
                  {status.configured ? "Chave cadastrada" : "Pendente"}
                </span>
              </div>
            </div>

            <div className="space-y-3 px-4 py-4 sm:px-5">
              <div>
                <label htmlFor="gemini-key">
                  <span className="label">Chave de API do Google Gemini</span>
                </label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <input
                      id="gemini-key"
                      type={showKey ? "text" : "password"}
                      autoComplete="off"
                      spellCheck={false}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        status.configured
                          ? "Deixe em branco para manter a chave atual ou cole uma nova"
                          : "Cole aqui a chave gerada no Google AI Studio"
                      }
                      className="field pr-20 font-mono !text-[12px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10.5px] font-bold text-slate-500 hover:bg-paper hover:text-ink"
                    >
                      {showKey ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                  Não tem a chave?{" "}
                  <Link
                    href="/ajuda/ia"
                    className="font-bold text-brand-dark hover:underline"
                  >
                    Veja o passo a passo de 2 minutos →
                  </Link>
                </p>
              </div>

              <div>
                <label htmlFor="gemini-model">
                  <span className="label">Modelo principal</span>
                </label>
                <select
                  id="gemini-model"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="field mt-1 text-[12px] font-semibold"
                >
                  {SELECTABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10.5px] text-slate-500">
                  Se o modelo escolhido retornar 503 ou lentidão, o aplicativo
                  alterna automaticamente para os demais modelos gratuitos.
                </p>
              </div>

              {feedback && (
                <div
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11.5px] font-semibold ${
                    feedback.type === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-success-soft text-success"
                  }`}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{feedback.text}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAndTest}
                  className="btn btn-brand"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Salvar e testar
                </button>

                {status.configured && (
                  <button
                    type="button"
                    disabled={testing}
                    onClick={handleTestConnection}
                    className="btn btn-ghost"
                  >
                    {testing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Testar conexão
                  </button>
                )}

                {status.source === "db" && (
                  <button
                    type="button"
                    disabled={removing}
                    onClick={handleRemoveKey}
                    className="btn text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover chave
                  </button>
                )}
              </div>

              <Link
                href="/mapas/novo"
                className="btn btn-primary w-full sm:w-auto"
              >
                Criar meu primeiro mapa com IA
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          <section className="card px-4 py-4 sm:px-5">
            <h2 className="text-[13.5px] font-extrabold text-ink">
              Perguntas rápidas
            </h2>
            <dl className="mt-2 space-y-2.5">
              {[
                {
                  q: "O Gemini tem opção gratuita?",
                  a: "O Google oferece uma cota gratuita para modelos elegíveis, sujeita a limites e condições. Consulte os preços e a disponibilidade do modelo antes de usar ou ativar faturamento.",
                },
                {
                  q: "Preciso informar cartão de crédito?",
                  a: "Para usar uma cota gratuita elegível, normalmente basta criar uma chave no Google AI Studio. Confira as condições atuais do seu projeto antes de escolher um plano pago.",
                },
                {
                  q: "Como devo proteger minha chave?",
                  a: "Uma chave salva aqui fica armazenada no banco do aplicativo e é exibida de forma mascarada. Em produção, prefira também a variável de ambiente GEMINI_API_KEY e nunca envie sua chave para repositórios públicos.",
                },
                {
                  q: "O que acontece com meus documentos?",
                  a: "Eles são enviados ao provedor configurado. No serviço gratuito do Gemini, o Google informa que pode usar entradas e respostas para melhorar produtos. Não envie dados pessoais, sensíveis ou confidenciais sem avaliar os termos aplicáveis.",
                },
              ].map((item) => (
                <div key={item.q} className="rounded-lg bg-paper px-3 py-2.5">
                  <dt className="text-[12px] font-extrabold text-ink">
                    {item.q}
                  </dt>
                  <dd className="mt-0.5 text-[11.5px] leading-snug text-slate-600">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card px-4 py-4">
            <p className="label !text-[8.5px]">Resumo em 3 passos</p>
            <ol className="mt-2 space-y-2.5">
              {[
                {
                  n: "1",
                  title: "Gere a chave grátis",
                  desc: "No Google AI Studio, com sua conta Gmail.",
                },
                {
                  n: "2",
                  title: "Cole a chave aqui",
                  desc: "No campo ao lado e clique em “Salvar e testar”.",
                },
                {
                  n: "3",
                  title: "Crie seu mapa",
                  desc: "Envie PDFs/fotos e a IA monta o comparativo.",
                },
              ].map((step) => (
                <li key={step.n} className="flex items-start gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-extrabold text-brand">
                    {step.n}
                  </span>
                  <div>
                    <p className="text-[12px] font-bold text-ink">
                      {step.title}
                    </p>
                    <p className="text-[10.5px] leading-snug text-slate-500">
                      {step.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost mt-3 w-full"
            >
              Abrir Google AI Studio
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>

          <section className="rounded-xl border border-line bg-white px-4 py-3.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-dark">
              Alternância automática de modelos
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">
              Se o modelo principal estiver ocupado (erro 503) ou lento, o
              sistema alterna automaticamente entre{" "}
              <strong>gemini-3.5-flash-lite</strong> (mais rápido e econômico) e{" "}
              <strong>gemini-4-hydrogen</strong> (equilíbrio entre velocidade e
              inteligência), além dos demais modelos gratuitos atuais.
            </p>
          </section>

          <section className="rounded-xl border border-brand/40 bg-brand-soft px-4 py-3.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-dark">
              Primeira vez aqui?
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">
              O guia explica cada clique, o que fazer se der erro e quanto custa
              (spoiler: nada no plano gratuito).
            </p>
            <Link
              href="/ajuda/ia"
              className="mt-2 inline-block text-[11px] font-bold text-ink hover:underline"
            >
              Abrir guia completo →
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
