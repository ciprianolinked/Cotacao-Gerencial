import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ArrowLeftIcon, ArrowRightIcon, FileIcon, SparklesIcon, CheckIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Central de ajuda · Gerencial",
  description: "Guias simples para configurar a inteligência artificial e publicar seu aplicativo Gerencial na internet.",
};

export default function AjudaPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-6 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-ink">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Voltar ao painel
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-2xl bg-ink px-6 py-9 text-white sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border-[55px] border-brand/10" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Central de ajuda Gerencial
            </span>
            <h1 className="font-display mt-4 text-[32px] leading-[1.1] sm:text-[43px]">Estamos aqui para ajudar.</h1>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-white/70 sm:text-[14px]">
              Guias diretos e sem complicação para configurar a inteligência artificial e colocar seu aplicativo no ar.
              Escolha por onde quer começar.
            </p>
          </div>
        </section>

        <div className="mt-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-brand-dark">Aprenda no seu ritmo</p>
            <h2 className="font-display mt-1 text-[23px] text-ink">Guias passo a passo</h2>
          </div>
          <span className="hidden text-[11px] font-semibold text-slate-400 sm:block">02 guias disponíveis</span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Link href="/ajuda/publicar" className="card group flex flex-col p-6 transition duration-200 hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-lg">
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-brand">
                <FileIcon className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-dark">Novo guia</span>
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">GitHub · Neon · Vercel</p>
            <h3 className="font-display mt-2 text-[21px] leading-tight text-ink">Publique seu aplicativo na internet</h3>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-500">
              Da criação das contas à configuração do banco, publicação e proteção do acesso. Tudo explicado para quem está começando.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-[12px] font-bold text-ink">
              Abrir guia de publicação
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link href="/ajuda/ia" className="card group flex flex-col p-6 transition duration-200 hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-lg">
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                <SparklesIcon className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-paper px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Google Gemini</span>
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Inteligência artificial</p>
            <h3 className="font-display mt-2 text-[21px] leading-tight text-ink">Ative a leitura de cotações com IA</h3>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-500">
              Saiba como obter sua chave, conectar o Gemini e testar a leitura de PDFs e imagens, incluindo os cuidados de privacidade.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-[12px] font-bold text-ink">
              Abrir guia de IA
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-white px-5 py-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success-soft text-success"><CheckIcon className="h-4 w-4" /></span>
          <p className="text-[12px] leading-relaxed text-slate-600">
            <strong className="text-ink">Seu ritmo, suas escolhas.</strong> Os guias não criam contas nem contratam planos automaticamente;
            você decide cada etapa e pode consultar os links oficiais antes de continuar.
          </p>
        </div>
      </main>
    </AppShell>
  );
}
