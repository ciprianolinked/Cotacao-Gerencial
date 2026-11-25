import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Como ativar a IA gratuita · Gerencial",
};

const STEPS = [
  {
    n: "1",
    title: "Tenha uma conta Google (Gmail)",
    desc: "Você pode usar qualquer conta Google pessoal ou corporativa. Não é necessário informar cartão de crédito para usar a cota gratuita do Google AI Studio.",
  },
  {
    n: "2",
    title: "Abra o Google AI Studio",
    desc: "Acesse aistudio.google.com/apikey em uma nova aba e faça login com sua conta Google. Se for o primeiro acesso, aceite os termos de uso do Google AI Studio.",
  },
  {
    n: "3",
    title: "Clique em “Get API key” (Obter chave)",
    desc: "No menu lateral ou no topo da página do Google AI Studio, localize o botão “Create API key” / “Criar chave de API”.",
  },
  {
    n: "4",
    title: "Crie a chave em um projeto",
    desc: "Escolha a opção para criar a chave em um novo projeto (ou selecione um projeto existente) e aguarde alguns segundos até o Google gerar o código.",
  },
  {
    n: "5",
    title: "Copie a chave inteira",
    desc: "Clique no botão “Copy” ao lado da chave gerada (ela costuma começar com AIza...). Certifique-se de copiar sem espaços extras no início ou no final.",
  },
  {
    n: "6",
    title: "Cole a chave aqui no aplicativo",
    desc: "Volte para a página Configurar IA, cole a chave no campo indicado e clique em “Salvar e testar”. Assim que aparecer a confirmação verde, sua IA já está pronta para ler PDFs e fotos.",
  },
];

export default function AjudaIaPage() {
  return (
    <main className="mx-auto max-w-[980px] px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-3 text-[11.5px] font-semibold text-slate-500">
        <Link href="/ajuda" className="inline-flex items-center gap-1.5 hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          Central de ajuda
        </Link>
        <span>·</span>
        <Link href="/configuracoes" className="hover:text-ink">
          Configurar IA
        </Link>
      </div>

      <section className="mt-3 rounded-2xl bg-ink px-6 py-7 text-white sm:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-deep">
          <Sparkles className="h-3 w-3" />
          Guia passo a passo · ~2 minutos
        </span>
        <h1 className="font-display mt-3 max-w-2xl text-[28px] leading-tight sm:text-[36px]">
          Como ativar a IA gratuita que lê suas cotações
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/75">
          Siga estas 6 etapas simples para conectar o Google Gemini gratuitamente
          e extrair fornecedores, itens, valores e condições diretamente dos
          PDFs e fotos dos orçamentos.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="btn btn-brand"
          >
            Abrir Google AI Studio
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Link
            href="/configuracoes"
            className="btn border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            Ir para Configurar IA
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-white px-5 py-5">
        <h2 className="text-[15px] font-extrabold text-ink">
          Modelos usados e alternância automática
        </h2>
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
          Na leitura de PDFs e fotos, o sistema usa sua chave para chamar os
          modelos nesta ordem. Se um modelo estiver ocupado (503), lento ou sem
          cota no momento, ele avança para o próximo automaticamente — sem
          perder seus arquivos nem exigir reenvio manual:
        </p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            {
              model: "gemini-3.5-flash-lite",
              note: "O mais rápido, econômico e estável · padrão recomendado",
            },
            {
              model: "gemini-4-hydrogen",
              note: "Equilíbrio entre velocidade e inteligência · cota gratuita",
            },
            {
              model: "gemini-3.8-flash",
              note: "Fallback de uso geral, alto throughput",
            },
            {
              model: "gemini-3.1-flash-lite",
              note: "Fallback econômico da geração anterior",
            },
            {
              model: "gemini-2.5-flash-lite",
              note: "Fallback legado de última instância",
            },
          ].map((item) => (
            <li
              key={item.model}
              className="rounded-lg bg-paper px-3 py-2.5"
            >
              <code className="text-[11px] font-bold text-ink">
                {item.model}
              </code>
              <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
                {item.note}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="text-[18px] font-extrabold text-ink">Passo a passo</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div key={step.n} className="card px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink text-[12px] font-extrabold text-brand">
                  {step.n}
                </span>
                <div>
                  <h3 className="text-[13.5px] font-extrabold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                    {step.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6 px-5 py-5">
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-ink">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Deu erro? Veja a solução
        </h2>
        <div className="mt-3 space-y-2.5">
          {[
            {
              title: "“Chave inválida ou sem permissão”",
              fix: "Confira se você copiou a chave inteira no Google AI Studio sem espaços ou quebras de linha, e se ela não foi revogada.",
            },
            {
              title: "Erro 503 — “serviço indisponível / sobrecarregado”",
              fix: "Isso é instabilidade temporária do Google, não problema do seu arquivo. O sistema já alterna automaticamente entre gemini-4-hydrogen e gemini-3.5-flash-lite (e demais modelos gratuitos) antes de falhar. Se ainda assim não concluir, aguarde alguns segundos e clique novamente — seus arquivos continuam selecionados.",
            },
            {
              title: "“Limite da cota gratuita atingido” (HTTP 429)",
              fix: "A cota gratuita do Gemini possui limite de requisições por minuto. Aguarde cerca de 1 minuto e clique novamente em Analisar propostas.",
            },
            {
              title: "Arquivo muito grande ou ilegível",
              fix: "Envie PDFs com texto nítido ou fotos bem iluminadas (até 6 arquivos por envio). Se preferir, use a opção “Ou cole o texto da cotação”, que funciona mesmo sem IA.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-line bg-paper/60 px-4 py-3"
            >
              <p className="text-[12.5px] font-extrabold text-ink">
                {item.title}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-600">
                {item.fix}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-4 px-5 py-5">
        <h2 className="text-[16px] font-extrabold text-ink">
          Perguntas frequentes
        </h2>
        <dl className="mt-3 space-y-2.5 text-[12px]">
          <div className="rounded-lg bg-paper px-3.5 py-2.5">
            <dt className="font-extrabold text-ink">
              Vou receber cobrança automática no futuro?
            </dt>
            <dd className="mt-0.5 text-slate-600">
              Não. Enquanto você não vincular um cartão de crédito nem ativar
              faturamento no Google Cloud, a chave opera apenas dentro dos
              limites da cota gratuita.
            </dd>
          </div>
          <div className="rounded-lg bg-paper px-3.5 py-2.5">
            <dt className="font-extrabold text-ink">
              Posso continuar usando o sistema sem configurar IA?
            </dt>
            <dd className="mt-0.5 text-slate-600">
              Sim! Todo o editor de mapas, o comparativo automático, o parecer
              técnico, o leitor de texto colado, a geração de PDF e o dashboard
              de indicadores funcionam 100% sem IA.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/40 bg-brand-soft px-6 py-5">
        <div>
          <h2 className="font-display text-[20px] text-ink">
            Pronto para ativar sua IA gratuita?
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-600">
            Cole sua chave do Google Gemini e comece a montar mapas em segundos.
          </p>
        </div>
        <Link href="/configuracoes" className="btn btn-primary">
          Ir para Configurar IA
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
