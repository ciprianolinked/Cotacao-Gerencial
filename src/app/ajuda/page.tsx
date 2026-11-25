import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  FileSpreadsheet,
  HelpCircle,
  Settings,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Central de Ajuda · Gerencial",
};

export default function AjudaPage() {
  return (
    <main className="mx-auto max-w-[1060px] px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao painel
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-dark">
            Central de ajuda
          </p>
          <h1 className="font-display mt-1 text-[30px] leading-tight text-ink sm:text-[36px]">
            Como podemos ajudar?
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] text-slate-500">
            Orientações práticas para elaborar mapas de cotação no padrão
            Gerencial, apresentar indicadores em assembleia e ativar a leitura
            automática com IA gratuita.
          </p>
        </div>
        <Link href="/ajuda/ia" className="btn btn-brand">
          <Sparkles className="h-4 w-4" />
          Guia da IA gratuita
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="card px-5 py-5">
            <h2 className="text-[16px] font-extrabold text-ink">
              Usando o mapa de cotação
            </h2>
            <p className="mt-1 text-[12px] text-slate-500">
              O fluxo completo de governança da Gerencial em 4 etapas simples:
            </p>
            <ol className="mt-4 space-y-3">
              {[
                {
                  n: "1",
                  title: "Crie uma nova cotação com o contexto do condomínio",
                  desc: "Informe o condomínio/associação, serviço ou produto, natureza (Serviço ou Produtos) e categoria. Todos os campos do cabeçalho podem ser editados depois.",
                },
                {
                  n: "2",
                  title: "Envie as propostas (PDF, foto) ou cole o texto",
                  desc: "Com o Gemini configurado, a IA lê até 6 arquivos simultaneamente, separa fornecedores, itens, quantidades e condições comerciais. Sem IA, você pode colar o texto ou preencher manualmente.",
                },
                {
                  n: "3",
                  title: "Classifique custos e revise o comparativo",
                  desc: "Classifique cada item como Mão de obra, Material ou Não discriminado. O sistema destaca automaticamente o menor preço por item, o melhor total completo e a economia potencial.",
                },
                {
                  n: "4",
                  title: "Exporte o PDF institucional e registre a contratação",
                  desc: "Gere o documento pronto para assinatura do analista, síndico(a) e conselho. Após aprovação, registre o valor contratado na Seção 5 e mude o status para Concluído para contabilizar a economia confirmada.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="flex items-start gap-3 rounded-xl bg-paper/70 px-3.5 py-3"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-extrabold text-brand">
                    {step.n}
                  </span>
                  <div>
                    <p className="text-[12.5px] font-extrabold text-ink">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-600">
                      {step.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card px-5 py-5">
            <h2 className="text-[16px] font-extrabold text-ink">
              Dúvidas frequentes
            </h2>
            <dl className="mt-3 space-y-2.5">
              {[
                {
                  q: "Por que a economia potencial aparece como “—” em alguns mapas?",
                  a: "A economia potencial compara apenas fornecedores com cobertura completa (todos os itens do escopo com preço preenchido). Quando há menos de 2 propostas completas, o sistema evita distorções e exibe “—”.",
                },
                {
                  q: "Qual a diferença entre Economia potencial e Economia confirmada?",
                  a: "Economia potencial é a diferença entre a maior e a menor proposta completa durante a análise. Economia confirmada só é contabilizada quando o mapa está marcado como Concluído e os valores de referência e contratação estão confirmados na Seção 5.",
                },
                {
                  q: "Posso adicionar mais propostas a um mapa já salvo?",
                  a: "Sim! Dentro do mapa, clique em “Abrir leitura de propostas” para enviar novos PDFs ou fotos — a ferramenta mescla novos fornecedores e completa preços faltantes sem apagar o que você já editou.",
                },
                {
                  q: "Como funciona a divisão entre Mão de obra, Material e Não discriminado?",
                  a: "Cada item da tabela possui um seletor de tipo de custo. Quando um orçamento apresenta valor global sem separação, mantemos como “Não discriminado” para transparência com o conselho.",
                },
              ].map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-xl border border-line bg-white px-4 py-3"
                >
                  <dt className="flex items-start gap-2 text-[12.5px] font-extrabold text-ink">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
                    {faq.q}
                  </dt>
                  <dd className="mt-1 pl-6 text-[11.5px] leading-relaxed text-slate-600">
                    {faq.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card px-4 py-4">
            <h2 className="text-[14px] font-extrabold text-ink">
              Precisa de um caminho rápido?
            </h2>
            <div className="mt-3 space-y-2">
              <Link
                href="/mapas/novo"
                className="btn btn-brand w-full !justify-between"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Nova cotação
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/indicadores"
                className="btn btn-ghost w-full !justify-between"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Indicadores para assembleia
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/condominios"
                className="btn btn-ghost w-full !justify-between"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Base de condomínios
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/configuracoes"
                className="btn btn-ghost w-full !justify-between"
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurar IA
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          <section className="rounded-xl bg-ink px-4 py-4 text-white">
            <h2 className="text-[14px] font-extrabold text-brand">
              Sua IA precisa de atenção?
            </h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/75">
              Veja o guia ilustrado com o passo a passo completo para criar sua
              chave gratuita do Google Gemini e resolver eventuais mensagens de
              erro.
            </p>
            <Link href="/ajuda/ia" className="btn btn-brand mt-3 w-full">
              Abrir guia da IA gratuita
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
