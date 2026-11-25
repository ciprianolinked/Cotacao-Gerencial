"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AiUploadPanel } from "./AiUploadPanel";
import { createBlankQuotation, formatDateLongBR, todayISO } from "@/lib/calculations";
import { CATEGORIES, type QuotationKind } from "@/lib/types";

interface NewMapClientProps {
  condominiumNames: string[];
}

export function NewMapClient({ condominiumNames }: NewMapClientProps) {
  const router = useRouter();
  const [condominium, setCondominium] = useState("");
  const [analysisDate, setAnalysisDate] = useState(() => todayISO());
  const [service, setService] = useState("");
  const [kind, setKind] = useState<QuotationKind>("servico");
  const [recipient, setRecipient] = useState("Síndico(a) e Conselho Consultivo");
  const [category, setCategory] = useState<string>("Manutenção predial");
  const [description, setDescription] = useState("");
  const [creatingBlank, setCreatingBlank] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateBlank() {
    setCreatingBlank(true);
    setError(null);
    try {
      const payload = createBlankQuotation({
        status: "rascunho",
        condominium: condominium.trim() || "Condomínio a definir",
        analysisDate,
        recipient: recipient.trim() || "Síndico(a) e Conselho Consultivo",
        service: service.trim() || "Nova cotação",
        description,
        kind,
        category,
      });

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.id) {
        throw new Error(json.error || "Não foi possível criar o mapa.");
      }
      router.push(`/mapas/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar mapa.");
      setCreatingBlank(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
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
            Novo mapa de cotação
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-slate-500">
            Preencha o contexto do condomínio, envie as propostas e a IA monta o
            comparativo. Você revisa cada campo antes de salvar — o cabeçalho é
            sempre editável.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-500 ring-1 ring-line">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-dark" />
          Padrão Gerencial de análise
        </span>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="card px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-[14px] font-extrabold text-ink">
                  Contexto do mapa
                </h2>
                <p className="text-[11.5px] text-slate-500">
                  Esses dados orientam a IA e já entram no cabeçalho do
                  documento.
                </p>
              </div>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-dark">
                Editável depois
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-6">
              <label className="sm:col-span-4">
                <span className="label">Condomínio / Associação</span>
                <input
                  list="novo-condominios"
                  value={condominium}
                  onChange={(e) => setCondominium(e.target.value)}
                  className="field mt-1"
                  placeholder="Selecione ou digite"
                />
                <datalist id="novo-condominios">
                  {condominiumNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>

              <label className="sm:col-span-2">
                <span className="label">Data análise</span>
                <input
                  type="date"
                  value={analysisDate}
                  onChange={(e) => setAnalysisDate(e.target.value)}
                  className="field mt-1"
                />
              </label>

              <label className="sm:col-span-4">
                <span className="label">Serviço / Objeto</span>
                <input
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="field mt-1"
                  placeholder="Ex.: materiais de hidráulica, manutenção de piscina, pintura de fachada"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="label">Natureza</span>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as QuotationKind)}
                  className="field mt-1"
                >
                  <option value="servico">Serviço</option>
                  <option value="produtos">Produtos</option>
                </select>
              </label>

              <label className="sm:col-span-4">
                <span className="label">A/C</span>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="field mt-1"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="label">Categoria</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="field mt-1"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-6">
                <span className="label">
                  Descrição (opcional — a IA também pode redigir)
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="field mt-1 resize-y text-[12.5px]"
                  rows={2}
                  placeholder="Escopo, premissas e necessidades do condomínio."
                />
              </label>
            </div>
          </section>

          <AiUploadPanel
            context={{
              condominium,
              analysisDate,
              recipient,
              service,
              description,
              kind,
              category,
            }}
            onExtracted={async ({ draft }) => {
              const res = await fetch("/api/quotations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draft),
              });
              const json = await res.json();
              if (!res.ok || !json.id) {
                throw new Error(json.error || "Erro ao salvar mapa gerado.");
              }
              router.push(`/mapas/${json.id}`);
            }}
          />
        </div>

        <aside className="space-y-4">
          <section className="card px-4 py-4">
            <h2 className="text-[13.5px] font-extrabold text-ink">
              Começar manualmente
            </h2>
            <p className="mt-1 text-[11.5px] leading-snug text-slate-500">
              Monte a tabela comparativa do zero e use a IA depois, se quiser.
            </p>
            <button
              type="button"
              disabled={creatingBlank}
              onClick={handleCreateBlank}
              className="btn btn-primary mt-3 w-full"
            >
              {creatingBlank ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando…
                </>
              ) : (
                <>
                  Criar mapa em branco
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[10.5px] text-slate-400">
              Data análise: {formatDateLongBR(analysisDate)}
            </p>
          </section>

          <section className="card px-4 py-4">
            <p className="label !text-[8.5px]">O que a IA entrega</p>
            <ul className="mt-2 space-y-2">
              {[
                "Leitura de PDFs e fotos de propostas (JPG, PNG, WEBP)",
                "Fornecedores, itens, quantidades e valores unitários",
                "Condições comerciais: prazo, pagamento e validade",
                "Comparativo com menor preço e economia apurada",
                "Parecer técnico e recomendação para o conselho",
              ].map((text) => (
                <li
                  key={text}
                  className="flex items-start gap-2 text-[11.5px] leading-snug text-slate-600"
                >
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-xl border border-brand/40 bg-ink px-4 py-4 text-white">
            <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              IA gratuita do Google
            </p>
            <p className="mt-1.5 text-[11.5px] leading-snug text-white/75">
              Ative a leitura automática de PDFs e fotos em 2 minutos, sem pagar
              nada e sem mexer em código: basta colar sua chave gratuita do
              Gemini.
            </p>
            <div className="mt-3 space-y-2">
              <Link href="/configuracoes" className="btn btn-brand w-full">
                Ativar IA grátis agora
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/ajuda/ia"
                className="btn w-full border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Ver passo a passo ilustrado
              </Link>
            </div>
            <p className="mt-2 text-center text-[10px] leading-snug text-white/50">
              Sem a IA, você ainda pode colar o texto ou preencher manualmente.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
