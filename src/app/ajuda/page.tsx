import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingIcon,
  CheckIcon,
  FileIcon,
  PrinterIcon,
  SparklesIcon,
  TrendIcon,
  UploadIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Ajuda · Como usar o Mapa de Cotação",
  description:
    "Aprenda a criar, preencher, comparar e imprimir mapas de cotação da Gerencial, com ou sem inteligência artificial.",
};

type Step = { n: string; title: string; body: string; tip?: string };

const PRIMEIRO_MAPA: Step[] = [
  {
    n: "1",
    title: "Clique em “Nova cotação”",
    body: "O botão fica no topo da tela, em qualquer página. Ele abre a ficha de um novo mapa de cotação em branco.",
    tip: "Pelo celular, o botão aparece como “Nova”.",
  },
  {
    n: "2",
    title: "Preencha o cabeçalho",
    body: "Informe o condomínio ou associação, a data da análise, o A/C (a quem se destina), o serviço ou objeto e a descrição. Todos esses campos continuam editáveis depois, a qualquer momento.",
    tip: "O condomínio digitado fica salvo e aparece como sugestão nas próximas cotações.",
  },
  {
    n: "3",
    title: "Escolha serviço ou produtos",
    body: "Use “Serviço” para contratações como manutenção e limpeza. Use “Produtos” para listas de materiais de elétrica, hidráulica, piscina e afins. Escolha também a categoria, que ajuda a organizar o histórico.",
  },
  {
    n: "4",
    title: "Cadastre os fornecedores",
    body: "Na seção de fornecedores, informe o nome de cada empresa consultada e, se tiver, o contato, o prazo de entrega, a forma de pagamento e a validade da proposta. Você pode comparar até 5 fornecedores no mesmo mapa.",
    tip: "Essas condições aparecem no documento final, ao lado dos valores.",
  },
  {
    n: "5",
    title: "Lance os itens e os preços",
    body: "Descreva cada item, informe a quantidade e a unidade, e digite o preço unitário de cada fornecedor. O sistema calcula os totais sozinho e destaca em verde o menor preço de cada linha.",
    tip: "Digite apenas os números: o campo já formata em reais.",
  },
  {
    n: "6",
    title: "Gere a análise e salve",
    body: "Clique em “Gerar análise” para o sistema redigir o resumo comparativo e a recomendação com base nos valores. Revise o texto, ajuste se quiser e clique em “Salvar”.",
    tip: "O mapa recebe um número de protocolo automático, como MC-2026-0001.",
  },
];

const COM_IA: Step[] = [
  {
    n: "1",
    title: "Abra a leitura de propostas",
    body: "Dentro de um mapa, clique em “Abrir leitura de propostas”. Em uma cotação nova, o painel já aparece aberto.",
  },
  {
    n: "2",
    title: "Envie os arquivos",
    body: "Arraste os PDFs ou as fotos dos orçamentos, ou clique para selecioná-los. São aceitos PDF, JPG, PNG e WEBP, até 6 arquivos por análise.",
    tip: "Publicado na Vercel, o total de cada envio deve ficar abaixo de 4 MB. Se passar, envie em partes.",
  },
  {
    n: "3",
    title: "Clique em “Analisar” e acompanhe",
    body: "Uma barra mostra a porcentagem do andamento e o tempo estimado. Normalmente leva poucos segundos. Se quiser interromper, use “Cancelar análise”.",
  },
  {
    n: "4",
    title: "Confira e aplique ao mapa",
    body: "A IA mostra quantos fornecedores e itens encontrou. Clique em “Aplicar dados ao mapa” para preencher a tabela automaticamente.",
    tip: "Atenção: aplicar uma nova análise substitui os itens e fornecedores atuais do mapa, em vez de somá-los.",
  },
  {
    n: "5",
    title: "Revise sempre antes de salvar",
    body: "A leitura automática é um apoio, não uma conferência final. Compare os valores com os documentos originais, corrija o que for preciso e só então salve.",
  },
];

const RECURSOS = [
  {
    icon: <TrendIcon className="h-5 w-5" />,
    title: "Comparativo automático",
    body: "O menor preço de cada item fica destacado em verde, e o painel lateral mostra a melhor proposta e a economia apurada em relação à mais cara.",
  },
  {
    icon: <CheckIcon className="h-5 w-5" />,
    title: "Pendências do mapa",
    body: "A lista de pendências indica o que falta para concluir: condomínio, objeto, pelo menos dois fornecedores e todos os itens com preço.",
  },
  {
    icon: <PrinterIcon className="h-5 w-5" />,
    title: "Impressão e PDF",
    body: "Use “Ver documento” para conferir o resultado e “Imprimir / salvar em PDF” para gerar o arquivo em A4, com o logo e as assinaturas.",
  },
  {
    icon: <BuildingIcon className="h-5 w-5" />,
    title: "Histórico por condomínio",
    body: "O painel inicial reúne todos os mapas, com busca por condomínio, objeto ou protocolo, e filtros por situação.",
  },
];

const SITUACOES = [
  { nome: "Rascunho", quando: "Mapa em elaboração, ainda sem todas as propostas." },
  { nome: "Em análise", quando: "Propostas lançadas e em avaliação pela governança." },
  { nome: "Concluído", quando: "Comparativo finalizado e recomendação definida." },
];

const DUVIDAS = [
  {
    q: "Posso usar o sistema sem a inteligência artificial?",
    a: "Sim. A IA só automatiza a leitura dos arquivos. Você pode preencher a tabela manualmente, ou colar o texto da proposta no campo “Ou cole o texto da cotação”, que o sistema tenta identificar fornecedores e valores. Todas as contas, destaques e a impressão funcionam normalmente.",
  },
  {
    q: "Como corrijo algo que a IA preencheu errado?",
    a: "Todos os campos continuam editáveis. Clique sobre o texto, o preço ou a quantidade e digite o valor correto. Os totais e o destaque de menor preço se recalculam na hora. Depois é só salvar.",
  },
  {
    q: "Dá para adicionar mais fornecedores ou itens depois?",
    a: "Sim. Use “Adicionar” na seção de fornecedores (até 5) e “Adicionar item” na tabela. Para remover, use o ícone de lixeira no fornecedor ou o “x” ao lado da linha do item.",
  },
  {
    q: "O que significa a economia apurada?",
    a: "É a diferença entre a proposta mais cara e a mais barata entre as que têm valores lançados. Ela indica quanto o condomínio deixa de gastar ao escolher a melhor proposta. O percentual é calculado sobre a proposta mais cara.",
  },
  {
    q: "Por que um fornecedor aparece sem total?",
    a: "Porque ele ainda não tem preço em nenhum item. Itens sem preço não entram no total daquele fornecedor. A coluna “Cobertura”, no documento, mostra quantos itens cada um cotou — útil quando um fornecedor não cotou tudo.",
  },
  {
    q: "Como imprimo ou envio o mapa ao síndico?",
    a: "Clique em “Imprimir / salvar em PDF”. O mapa é salvo automaticamente antes e abre em uma página pronta para impressão em A4. Na janela de impressão, escolha “Salvar como PDF” para gerar o arquivo e enviá-lo por e-mail.",
  },
  {
    q: "Como excluo um mapa criado por engano?",
    a: "Abra o mapa e use “Excluir mapa”, na coluna da direita. Será pedida uma confirmação. A exclusão é definitiva; o nome do condomínio permanece cadastrado para futuras cotações.",
  },
  {
    q: "A análise demora ou dá erro. O que faço?",
    a: "Normalmente a leitura leva poucos segundos. Se aparecer aviso de sobrecarga do Google, o sistema já tenta outros modelos sozinho; aguarde alguns minutos e repita. Se o erro citar limite de envio, mande menos arquivos por vez ou reduza o tamanho dos PDFs.",
  },
];

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="mt-3 space-y-2.5">
      {steps.map((step) => (
        <li key={step.n} className="card flex gap-3.5 px-4 py-4 sm:px-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink text-[14px] font-extrabold text-brand">
            {step.n}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-extrabold leading-tight text-ink">{step.title}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">{step.body}</p>
            {step.tip && (
              <p className="mt-2 rounded-lg bg-brand-soft px-2.5 py-1.5 text-[11.5px] leading-snug text-brand-dark">
                <span className="font-extrabold">Dica: </span>
                {step.tip}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-dark">{eyebrow}</p>
      <h2 className="font-display mt-1 text-[22px] leading-tight text-ink">{title}</h2>
      {children}
    </div>
  );
}

export default function AjudaPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-6 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-ink">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar ao painel
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-2xl bg-ink px-6 py-9 text-white sm:px-10 sm:py-11">
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border-[55px] border-brand/10" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Ajuda · Como usar o sistema
            </span>
            <h1 className="font-display mt-4 text-[30px] leading-[1.1] sm:text-[40px]">
              Do orçamento recebido ao mapa aprovado.
            </h1>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-white/70 sm:text-[14px]">
              Guia prático para criar, comparar, imprimir e organizar as cotações dos seus condomínios.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11.5px] font-bold">
              <a href="#primeiro" className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15">Criar um mapa</a>
              <a href="#ia" className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15">Usar a IA</a>
              <a href="#recursos" className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15">Recursos</a>
              <a href="#duvidas" className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15">Dúvidas</a>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <FileIcon className="h-5 w-5" />, t: "1. Monte o mapa", d: "Cabeçalho, fornecedores e itens." },
            { icon: <UploadIcon className="h-5 w-5" />, t: "2. Compare", d: "Menor preço e economia automáticos." },
            { icon: <PrinterIcon className="h-5 w-5" />, t: "3. Aprove", d: "Documento em PDF para o síndico." },
          ].map((item) => (
            <div key={item.t} className="card flex items-start gap-3 px-4 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                {item.icon}
              </span>
              <div>
                <p className="text-[13px] font-extrabold text-ink">{item.t}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{item.d}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="primeiro" className="mt-9 scroll-mt-24">
          <SectionTitle eyebrow="Passo a passo" title="Criar seu primeiro mapa de cotação">
            <p className="mt-1.5 max-w-2xl text-[12.5px] text-slate-500">
              Siga na ordem. Leva poucos minutos e você pode salvar e continuar depois.
            </p>
          </SectionTitle>
          <StepList steps={PRIMEIRO_MAPA} />
          <Link href="/mapas/novo" className="btn btn-brand mt-4">
            Criar uma cotação agora
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </section>

        <section id="ia" className="mt-10 scroll-mt-24">
          <SectionTitle eyebrow="Leitura automática" title="Preencher o mapa com inteligência artificial">
            <p className="mt-1.5 max-w-2xl text-[12.5px] text-slate-500">
              A IA lê os PDFs e as fotos das propostas e preenche a tabela para você revisar.
            </p>
          </SectionTitle>
          <StepList steps={COM_IA} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5">
            <p className="max-w-lg text-[12px] leading-relaxed text-slate-600">
              <strong className="text-ink">Ainda não ativou a IA?</strong> É gratuito e leva cerca de 2 minutos, com uma
              conta Google. Sem ela, o sistema continua funcionando no preenchimento manual.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/ajuda/ia" className="btn btn-ghost">Como ativar</Link>
              <Link href="/configuracoes" className="btn btn-brand">Configurar IA</Link>
            </div>
          </div>
        </section>

        <section id="recursos" className="mt-10 scroll-mt-24">
          <SectionTitle eyebrow="No dia a dia" title="Recursos que ajudam na decisão" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {RECURSOS.map((item) => (
              <div key={item.title} className="card px-4 py-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-brand">{item.icon}</span>
                <h3 className="mt-3 text-[13.5px] font-extrabold text-ink">{item.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="card mt-3 px-4 py-4 sm:px-5">
            <h3 className="text-[13.5px] font-extrabold text-ink">Situação de cada mapa</h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Escolha a situação no alto da ficha. Ela organiza o painel e os filtros de busca.
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              {SITUACOES.map((item) => (
                <div key={item.nome} className="rounded-lg bg-paper px-3 py-2.5">
                  <dt className="text-[12px] font-extrabold text-ink">{item.nome}</dt>
                  <dd className="mt-0.5 text-[11px] leading-snug text-slate-600">{item.quando}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="duvidas" className="mt-10 scroll-mt-24">
          <SectionTitle eyebrow="Dúvidas frequentes" title="Perguntas de quem usa o sistema" />
          <div className="mt-3 space-y-2">
            {DUVIDAS.map((item) => (
              <details key={item.q} className="group rounded-xl border border-line bg-white px-5 py-4 shadow-sm">
                <summary className="cursor-pointer list-none text-[13px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link href="/ajuda/ia" className="card group flex items-start gap-3 px-5 py-5 transition hover:border-brand/60">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
              <SparklesIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13px] font-extrabold text-ink">Ativar a IA gratuita</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
                Passo a passo para obter a chave do Google e conectar.
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-brand-dark">
                Abrir guia <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
          <Link href="/ajuda/publicar" className="card group flex items-start gap-3 px-5 py-5 transition hover:border-brand/60">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-brand">
              <FileIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13px] font-extrabold text-ink">Publicar o site na internet</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
                GitHub, Neon e Vercel explicados do zero, com proteção de acesso.
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-brand-dark">
                Abrir guia <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </section>

        <p className="mt-9 border-t border-line pt-5 text-center text-[11px] leading-relaxed text-slate-400">
          Gerencial · Governança Condominial — a conferência final dos valores e a decisão de contratação continuam
          sendo do síndico e do conselho.
        </p>
      </main>
    </AppShell>
  );
}
