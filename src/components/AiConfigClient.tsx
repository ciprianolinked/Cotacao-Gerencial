"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ExternalLink, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import type { PublicAiConfig } from "@/lib/ai-settings";
import { ApiRequestError, fetchApiJson } from "@/lib/http-client";

interface AiConfigClientProps { initialStatus: PublicAiConfig }
interface SavedResponse extends PublicAiConfig { ok: boolean; saved: boolean; message: string }
interface TestResponse {
  ok: boolean;
  model: string;
  modelRemembered: boolean;
  message: string;
  warning?: string;
}
type Feedback = { type: "success" | "warning" | "error" | "info"; text: string; requestId?: string };

export function AiConfigClient({ initialStatus }: AiConfigClientProps) {
  const [status, setStatus] = useState(initialStatus);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [operation, setOperation] = useState<"save" | "save-test" | "test" | "remove" | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [testedDraft, setTestedDraft] = useState<{ key: string; model: string } | null>(null);
  const busy = operation !== null;

  function errorFeedback(error: unknown, prefix = "", type: Feedback["type"] = "error") {
    setFeedback({
      type,
      text: prefix + (error instanceof Error ? error.message : "Não foi possível concluir esta operação."),
      requestId: error instanceof ApiRequestError ? error.requestId : undefined,
    });
  }

  async function testKey(key: string | undefined, model: string | undefined): Promise<TestResponse> {
    return fetchApiJson<TestResponse>("/api/ai/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key, model }),
    });
  }

  async function handleSaveAndTest() {
    if (busy) return;
    const keyToSave = apiKey.trim();
    if (!keyToSave) {
      setFeedback({ type: "error", text: "Cole sua chave de API no campo antes de salvar." });
      return;
    }
    setOperation("save");
    setFeedback({ type: "info", text: "Salvando a chave no banco de dados…" });
    let saved: SavedResponse;
    try {
      saved = await fetchApiJson<SavedResponse>("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keyToSave,
          // Reuse a successful test of this exact draft; editing the key resets it.
          model: testedDraft?.key === keyToSave ? testedDraft.model : undefined,
        }),
      });
      if (!saved.saved || !saved.ok) throw new Error("O servidor não confirmou o salvamento. Sua chave continua no campo.");
      setStatus({ configured: saved.configured, source: saved.source, maskedKey: saved.maskedKey, model: saved.model });
      setApiKey("");
      setTestedDraft(null);
    } catch (error) {
      errorFeedback(error, "Não foi possível confirmar o salvamento. ");
      setOperation(null);
      return;
    }

    // A separate request means a Gemini timeout cannot undo the successful save.
    setOperation("save-test");
    setFeedback({ type: "info", text: "Chave salva com sucesso. Testando agora a conexão com o Google…" });
    try {
      const result = await testKey(keyToSave, saved.model);
      if (result.modelRemembered) setStatus((prev) => ({ ...prev, model: result.model }));
      setFeedback({
        type: result.warning || !result.modelRemembered ? "warning" : "success",
        text: `Chave salva com sucesso. ${result.message}${result.warning ? ` ${result.warning}` : !result.modelRemembered ? " O modelo não foi memorizado; confira se a configuração foi alterada em outra sessão." : " Este modelo será usado primeiro nas próximas leituras."}`,
      });
    } catch (error) {
      errorFeedback(error, "A chave foi salva, mas o teste de conexão não foi concluído. Você não precisa salvar novamente. ", "warning");
    } finally { setOperation(null); }
  }

  async function handleTestConnection() {
    if (busy) return;
    const draft = apiKey.trim();
    setOperation("test");
    setFeedback({ type: "info", text: draft ? "Testando a chave informada no campo, sem salvá-la…" : "Testando a chave já cadastrada…" });
    try {
      const result = await testKey(
        draft || undefined,
        testedDraft?.key === draft && draft ? testedDraft.model : !draft ? status.model : undefined
      );
      if (draft) setTestedDraft({ key: draft, model: result.model });
      if (result.modelRemembered) setStatus((prev) => ({ ...prev, model: result.model }));
      setFeedback({
        type: result.warning ? "warning" : "success",
        text: `${result.message} ${draft && !result.modelRemembered ? "A chave informada ainda não foi salva. Clique em Salvar e testar para cadastrá-la." : result.modelRemembered ? "Modelo memorizado para as próximas leituras." : "Teste concluído; a configuração não foi alterada."}${result.warning ? ` ${result.warning}` : ""}`,
      });
    } catch (error) { errorFeedback(error); }
    finally { setOperation(null); }
  }

  async function handleRemoveKey() {
    if (busy || !window.confirm("Remover a chave Gemini salva no painel?")) return;
    setOperation("remove");
    setFeedback(null);
    try {
      const result = await fetchApiJson<PublicAiConfig>("/api/ai/config", { method: "DELETE" });
      setStatus(result);
      setApiKey("");
      setTestedDraft(null);
      setFeedback({ type: "success", text: result.source === "env" ? "Chave removida do banco. A chave da variável de ambiente continua ativa." : "Chave removida do banco do aplicativo." });
    } catch (error) { errorFeedback(error); }
    finally { setOperation(null); }
  }

  return (
    <main className="mx-auto max-w-[980px] px-4 pb-16 pt-5 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Painel de cotações
      </Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-tight text-ink sm:text-[34px]">Configurar IA gratuita</h1>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-slate-500">Conecte o Google Gemini para ler PDFs e fotos de propostas e montar o comparativo. Salve sua chave e confira a conexão em etapas independentes.</p>
        </div>
        <Link href="/ajuda/ia" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[10.5px] font-bold text-brand transition hover:bg-ink-soft">
          <BookOpen className="h-3.5 w-3.5" /> Passo a passo ilustrado <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="bg-ink px-4 py-3.5 text-white sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-ink-deep"><Sparkles className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-extrabold leading-tight">{status.configured ? "Chave cadastrada" : "IA ainda não configurada"}</h2>
                    <p className="mt-0.5 break-words text-[11.5px] text-white/65">{status.configured ? `Google Gemini · ${status.model} · ${status.source === "env" ? "variável de ambiente" : "salva no painel"} · ${status.maskedKey}` : "Cole uma chave do Google AI Studio para ativar a leitura de PDFs e imagens."}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${status.configured ? "bg-brand text-ink-deep" : "bg-white/15 text-white"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.configured ? "bg-ink-deep" : "bg-amber-300"}`} />
                  {status.configured ? "Configuração salva" : "Pendente"}
                </span>
              </div>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <label htmlFor="gemini-key"><span className="label">Chave de API do Google Gemini</span></label>
              <div className="relative mt-1.5">
                <input id="gemini-key" type={showKey ? "text" : "password"} autoComplete="off" spellCheck={false} disabled={busy}
                  value={apiKey} onChange={(event) => { setApiKey(event.target.value); setTestedDraft(null); }}
                  placeholder="Cole aqui a chave gerada no Google AI Studio" className="field !pr-20 font-mono !text-[12px]" />
                <button type="button" onClick={() => setShowKey((value) => !value)} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10.5px] font-bold text-slate-500 hover:bg-paper hover:text-ink">{showKey ? "Ocultar" : "Mostrar"}</button>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-slate-500">Não tem a chave? <Link href="/ajuda/ia" className="font-bold text-brand-dark hover:underline">Veja o passo a passo →</Link></p>
              <p className="mt-2 text-[10.5px] leading-relaxed text-slate-500">{apiKey.trim() ? "O teste verificará exatamente a chave acima, sem substituir a configuração salva." : "Com o campo vazio, Testar conexão usa a chave já cadastrada."}</p>

              {feedback && (
                <div role={feedback.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[11.5px] font-semibold leading-relaxed ${feedback.type === "error" ? "border-red-200 bg-red-50 text-red-700" : feedback.type === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : feedback.type === "info" ? "border-line bg-paper text-ink" : "border-success/20 bg-success-soft text-success"}`}>
                  {feedback.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : feedback.type === "info" ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <div><p>{feedback.text}</p>{feedback.requestId && <p className="mt-1 break-all font-mono text-[9px] font-normal opacity-75">Referência: {feedback.requestId}</p>}</div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy || !apiKey.trim()} onClick={handleSaveAndTest} className="btn btn-brand">
                  {operation === "save" || operation === "save-test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {operation === "save" ? "Salvando…" : operation === "save-test" ? "Chave salva · testando…" : "Salvar e testar"}
                </button>
                <button type="button" disabled={busy || (!status.configured && !apiKey.trim())} onClick={handleTestConnection} className="btn btn-ghost">
                  {operation === "test" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {operation === "test" ? "Testando conexão…" : "Testar conexão"}
                </button>
                {status.source === "db" && <button type="button" disabled={busy} onClick={handleRemoveKey} className="btn text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />{operation === "remove" ? "Removendo…" : "Remover chave"}</button>}
              </div>
              <p className="mt-2 text-[10px] leading-snug text-slate-400">Salvar grava a chave primeiro. Se o Google estiver indisponível no teste seguinte, a chave continua salva e você pode testar novamente.</p>
              <Link href="/mapas/novo" className="btn btn-primary mt-3 w-full sm:w-auto">Criar mapa com IA <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </section>
          <section className="card px-4 py-4 sm:px-5">
            <h2 className="text-[13.5px] font-extrabold text-ink">Perguntas rápidas</h2>
            <dl className="mt-2 space-y-2.5">
              {[
                { q: "Qual a diferença entre salvar e testar?", a: "Salvar grava sua configuração no banco. Testar verifica se o Google responde à chave informada ou à chave cadastrada. Um teste bem-sucedido antes de salvar não cadastra uma chave nova automaticamente." },
                { q: "O Gemini tem opção gratuita?", a: "O Google oferece cotas gratuitas para modelos elegíveis, sujeitas a limites e às condições do seu projeto. Confira disponibilidade e preços antes de ativar faturamento." },
                { q: "Por que o modelo mudou depois do teste?", a: "Se o modelo preferido estiver indisponível ou lento, outro é tentado dentro do prazo. O modelo que responder com a chave cadastrada é memorizado e passa a ser usado primeiro." },
                { q: "Como devo proteger minha chave?", a: "A chave fica no servidor, é exibida apenas de forma mascarada e não é incluída em logs de erro. Proteja o acesso ao painel; em produção você também pode usar a variável GEMINI_API_KEY." },
                { q: "O que acontece com meus documentos?", a: "Eles são enviados ao Google para processamento. Avalie os termos, os limites e a política de privacidade do provedor antes de enviar informações pessoais, sensíveis ou confidenciais." },
              ].map((item) => <div key={item.q} className="rounded-lg bg-paper px-3 py-2.5"><dt className="text-[12px] font-extrabold text-ink">{item.q}</dt><dd className="mt-0.5 text-[11.5px] leading-snug text-slate-600">{item.a}</dd></div>)}
            </dl>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="card px-4 py-4">
            <p className="label !text-[8.5px]">Resumo em 3 passos</p>
            <ol className="mt-2 space-y-2.5">
              {[
                { n: "1", title: "Crie sua chave", desc: "No Google AI Studio, usando sua conta Google." },
                { n: "2", title: "Salve e confira a conexão", desc: "O salvamento é confirmado antes de iniciar o teste." },
                { n: "3", title: "Crie seu mapa", desc: "Envie PDFs/fotos e revise o comparativo gerado." },
              ].map((step) => <li key={step.n} className="flex items-start gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-extrabold text-brand">{step.n}</span><div><p className="text-[12px] font-bold text-ink">{step.title}</p><p className="text-[10.5px] leading-snug text-slate-500">{step.desc}</p></div></li>)}
            </ol>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="btn btn-ghost mt-3 w-full">Abrir Google AI Studio <ExternalLink className="h-3.5 w-3.5" /></a>
          </section>
          <section className="rounded-xl border border-line bg-white px-4 py-3.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-dark">Alternância automática de modelos</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">O último modelo validado com sua chave é usado primeiro. Se necessário, o sistema tenta alternativas, incluindo <strong>gemini-4-hydrogen</strong> e <strong>gemini-3.5-flash-lite</strong>, conforme a disponibilidade da sua conta.</p>
            <p className="mt-2 text-[10.5px] leading-snug text-slate-500">As tentativas têm um prazo total; indisponibilidade do Google não é tratada como falha ao salvar sua chave.</p>
          </section>
          <section className="rounded-xl border border-brand/40 bg-brand-soft px-4 py-3.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-dark">Precisa de ajuda?</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">Veja como gerar a chave, consultar a cota e identificar problemas de conexão.</p>
            <Link href="/ajuda/ia" className="mt-2 inline-block text-[11px] font-bold text-ink hover:underline">Abrir guia completo →</Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
