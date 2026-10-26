import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Central de Ajuda · Gerencial",
  description:
    "Guias passo a passo ilustrados para ativar a IA gratuita do Google Gemini e publicar o aplicativo na internet usando GitHub, Neon e Vercel — 100% grátis.",
};

/* ------------------------------------------------------------------ */
/* 1. GUIA: IA GRATUITA (GOOGLE GEMINI)                                */
/* ------------------------------------------------------------------ */

const GEMINI_STEPS = [
  {
    n: "1",
    title: "Tenha uma conta Google (Gmail)",
    body: "Você precisa apenas de uma conta Google comum — a mesma do Gmail ou YouTube. Se ainda não tiver, crie grátis em accounts.google.com. Não é preciso cadastrar cartão de crédito em nenhum momento.",
    tip: "Se possível, use o e-mail oficial da sua empresa, para que a chave fique vinculada à Gerencial.",
  },
  {
    n: "2",
    title: "Acesse o Google AI Studio",
    body: "No navegador, acesse o endereço aistudio.google.com e entre com a sua conta Google. Esta é a plataforma oficial do Google para desenvolvedores gerarem chaves da IA Gemini.",
    tip: "Link direto para a tela de chaves: aistudio.google.com/apikey",
    link: { href: "https://aistudio.google.com/apikey", label: "Abrir Google AI Studio" },
  },
  {
    n: "3",
    title: "Clique em “Create API key” (Criar chave)",
    body: "Na tela que abrir, clique no botão azul “Create API key” (ou “Get API key”). Se for sua primeira vez, o Google mostrará uma caixinha com os termos de uso — marque que concorda e confirme.",
    tip: "O site costuma ficar em inglês; procure exatamente pelo botão azul com o texto “Create API key”.",
  },
  {
    n: "4",
    title: "Escolha o projeto padrão",
    body: "Uma janelinha vai perguntar em qual projeto você deseja criar a chave. Pode escolher a opção padrão que o Google sugere (geralmente chamada “Generative Language Client” ou “My First Project”) e clicar em “Create key in existing project”.",
    tip: "Não precisa configurar nada no Google Cloud. O projeto automático funciona perfeitamente.",
  },
  {
    n: "5",
    title: "Copie a chave gerada",
    body: "O Google vai exibir uma janela com a sua chave — é um código longo de aproximadamente 39 caracteres que sempre começa com “AIza…”. Clique no botão de copiar ao lado dela para não esquecer nenhuma letra.",
    tip: "Guarde essa chave como uma senha. Nunca compartilhe em chats públicos.",
  },
  {
    n: "6",
    title: "Cole no aplicativo e teste",
    body: "Volte para este aplicativo, abra o menu “Configurar IA”, cole a chave no campo indicado e clique em “Salvar e testar”. Se aparecer a mensagem verde de sucesso, a IA já está ativa e você pode enviar PDFs e fotos de propostas!",
    tip: "Feito isso uma única vez, a chave fica gravada no banco e você não precisa repetir.",
    link: { href: "/configuracoes", label: "Ir para Configurar IA", internal: true },
  },
];

/* ------------------------------------------------------------------ */
/* 2. GUIA: GITHUB (GUARDAR O CÓDIGO)                                 */
/* ------------------------------------------------------------------ */

const GITHUB_STEPS = [
  {
    n: "1",
    title: "O que é o GitHub e por que precisamos dele?",
    body: "Pense no GitHub como um “Google Drive” ou “Dropbox” exclusivo para código de computadores. Ele guarda todos os arquivos do seu aplicativo com segurança na nuvem. A Vercel (onde o site vai funcionar) precisa do GitHub para pegar o código e colocar o site no ar.",
    tip: "Criar uma conta no GitHub é 100% grátis e leva 1 minuto.",
  },
  {
    n: "2",
    title: "Crie sua conta no GitHub",
    body: "Acesse github.com e clique em “Sign up”. Informe seu e-mail, crie uma senha e escolha um nome de usuário (ex.: gerencial-cond). O GitHub vai enviar um código de 6 dígitos no seu e-mail para confirmar.",
    link: { href: "https://github.com/signup", label: "Criar conta no GitHub" },
  },
  {
    n: "3",
    title: "Crie um novo repositório (uma pasta para o seu app)",
    body: "Depois de entrar no GitHub, clique no botão verde “New” (ou no símbolo de “+” no topo direito e em “New repository”).",
    tip: "“Repositório” é apenas o nome chique que o GitHub dá para a pasta do projeto.",
  },
  {
    n: "4",
    title: "Dê um nome e marque como Privado",
    body: "No campo “Repository name”, digite por exemplo: mapa-cotacao-gerencial. Embaixo, marque a opção “Private” (Privado) para que somente você e sua equipe possam ver os arquivos. Deixe todas as outras opções desmarcadas e clique no botão verde “Create repository”.",
    tip: "Manter o repositório como Privado é grátis no GitHub e protege a identidade da sua empresa.",
  },
  {
    n: "5",
    title: "Envie os arquivos para o GitHub",
    body: "Se você estiver baixando este projeto ou usando um computador com Git, basta rodar os comandos que o GitHub mostra na tela: git remote add origin URL_DO_SEU_REPOSITORIO e git push -u origin main. Se preferir fazer pelo navegador, clique no link “uploading an existing file” e arraste os arquivos do projeto.",
    tip: "Nunca envie o arquivo .env com senhas reais para o GitHub. A Vercel cuida das senhas separadamente.",
  },
];

/* ------------------------------------------------------------------ */
/* 3. GUIA: NEON.TECH (BANCO DE DADOS GRATUITO)                        */
/* ------------------------------------------------------------------ */

const NEON_STEPS = [
  {
    n: "1",
    title: "O que é o Neon.tech e por que precisamos dele?",
    body: "O Neon (neon.tech) é um serviço moderno de banco de dados PostgreSQL na nuvem. É lá que ficam guardados com segurança todos os seus mapas de cotação, os fornecedores, os preços e os condomínios. Sem banco de dados, o site esqueceria tudo sempre que a página fosse fechada.",
    tip: "O plano gratuito do Neon é perfeito: oferece banco de dados rápido, seguro e sem custo para o porte do aplicativo.",
  },
  {
    n: "2",
    title: "Crie sua conta no Neon com o GitHub",
    body: "Acesse neon.tech e clique no botão “Sign up”. A forma mais simples e recomendada é clicar em “Continue with GitHub” — assim você usa o mesmo login criado no passo anterior, sem precisar de outra senha.",
    link: { href: "https://neon.tech", label: "Abrir o Neon.tech" },
  },
  {
    n: "3",
    title: "Crie seu primeiro projeto no Neon",
    body: "Assim que entrar, o Neon vai abrir a tela “Create Project”. No campo “Project name”, coloque por exemplo gerencial-db. Na região do servidor, você pode escolher qualquer uma das opções sugeridas (ex.: US East ou São Paulo, se disponível). Clique no botão “Create project”.",
    tip: "Leva menos de 5 segundos para o Neon criar o banco de dados.",
  },
  {
    n: "4",
    title: "Copie a “Connection String” (o endereço secreto do banco)",
    body: "Na tela seguinte, o Neon vai mostrar uma caixinha chamada “Connection string”. Certifique-se de que a caixinha “Pooled connection” está marcada. O endereço se parece com isso: postgresql://usuario:senha@ep-xyz-pooler.neon.tech/neondb?sslmode=require. Clique no botão de copiar.",
    tip: "Esse endereço longo contém o usuário, a senha e o servidor do seu banco. Guarde-o, pois vamos usá-lo na Vercel no próximo passo.",
  },
];

/* ------------------------------------------------------------------ */
/* 4. GUIA: VERCEL (COLOCAR O SITE NA INTERNET)                       */
/* ------------------------------------------------------------------ */

const VERCEL_STEPS = [
  {
    n: "1",
    title: "O que é a Vercel e o que ela faz?",
    body: "A Vercel (vercel.com) é a empresa criadora do Next.js (a tecnologia em que este app foi feito) e a melhor plataforma do mundo para colocar esse tipo de site na internet. Ela pega o código do GitHub, conecta ao banco do Neon e gera um link oficial seguro (com cadeado https://) para você e sua equipe acessarem de qualquer computador, tablet ou celular.",
    tip: "O plano Hobby da Vercel é 100% grátis e nunca expira.",
  },
  {
    n: "2",
    title: "Crie sua conta na Vercel com o GitHub",
    body: "Acesse vercel.com e clique em “Sign Up”. Escolha a opção “Hobby” (uso pessoal/profissional gratuito) e clique em “Continue with GitHub”. Autorize a conexão quando o GitHub pedir.",
    link: { href: "https://vercel.com/signup", label: "Criar conta na Vercel" },
  },
  {
    n: "3",
    title: "Importe o projeto do GitHub",
    body: "No painel da Vercel, clique no botão azul “Add New…” e depois em “Project”. Você verá a lista dos seus repositórios do GitHub. Encontre o mapa-cotacao-gerencial e clique no botão “Import” ao lado dele.",
    tip: "Se o projeto não aparecer na lista, clique em “Configure GitHub App” para dar permissão à Vercel de ler aquele repositório privado.",
  },
  {
    n: "4",
    title: "Configure as variáveis de ambiente (o passo mais importante!)",
    body: "Na tela de configuração antes de publicar, procure a seção chamada “Environment Variables” (Variáveis de Ambiente). Você precisa adicionar as variáveis que o app precisa para funcionar:",
    variables: [
      {
        name: "DATABASE_URL",
        value: "Cole aqui a Connection String que você copiou lá no Neon (aquela que começa com postgresql://...).",
        required: true,
      },
      {
        name: "GEMINI_API_KEY",
        value: "Cole a sua chave gratuita do Google Gemini (aquela que começa com AIza...). Se preferir, você também pode deixar para colar depois pelo painel do app em “Configurar IA”.",
        required: false,
      },
    ],
    tip: "Basta colar o nome no campo 'Key', o valor no campo 'Value' e clicar no botão 'Add'.",
  },
  {
    n: "5",
    title: "Clique em “Deploy” e espere a mágica acontecer",
    body: "Com a variável DATABASE_URL adicionada, clique no botão azul “Deploy”. A Vercel vai instalar tudo, compilar o código e publicar seu site. Isso leva cerca de 1 a 2 minutos. Quando terminar, vai aparecer uma chuva de confetes na tela e uma prévia do seu site!",
    tip: "A Vercel gera um link gratuito como seu-app.vercel.app. Você já pode abrir e começar a usar.",
  },
  {
    n: "6",
    title: "Crie a estrutura do banco pela primeira vez",
    body: "Como o banco do Neon acabou de ser criado, ele precisa receber as tabelas do aplicativo. Para isso, você roda uma única vez no seu computador (ou no terminal onde estiver o código) o comando: npx drizzle-kit push (com a DATABASE_URL do Neon configurada). Pronto! As tabelas de mapas, condomínios e configurações são criadas instantaneamente.",
    tip: "Se precisar de ajuda com esse comando, qualquer pessoa com conhecimento básico de Node.js roda em 10 segundos.",
  },
  {
    n: "7",
    title: "Opcional: use o seu domínio próprio (ex.: cotacao.gerencialcond.com.br)",
    body: "Se a Gerencial tiver domínio próprio (como gerencialcond.com.br), você pode colocar o app em um subdomínio profissional sem pagar nada a mais. Na Vercel, vá em Settings > Domains, digite por exemplo cotacao.gerencialcond.com.br e siga as instruções para apontar o CNAME no seu provedor de domínio (Registro.br, GoDaddy, Wix, etc.).",
    tip: "A Vercel gera certificado de segurança SSL (o cadeado verde) de graça e automaticamente.",
  },
];

/* ------------------------------------------------------------------ */
/* ERROS COMUNS NA PUBLICAÇÃO                                         */
/* ------------------------------------------------------------------ */

const DEPLOY_ERRORS = [
  {
    symptom: "Erro de banco na Vercel: “DATABASE_URL is required”",
    cause: "A variável com o endereço do Neon não foi adicionada nas configurações da Vercel.",
    fix: "Vá no painel do seu projeto na Vercel > Settings > Environment Variables, adicione a variável DATABASE_URL com o link do Neon e depois vá em Deployments > clique nos três pontinhos do último deploy > Redeploy.",
  },
  {
    symptom: "Telas carregam mas dá erro ao salvar: “relation quotations does not exist”",
    cause: "O banco de dados do Neon foi conectado, mas a estrutura de tabelas ainda não foi criada.",
    fix: "Rode o comando `npx drizzle-kit push` apontando para a URL do Neon para criar as tabelas no banco de dados.",
  },
  {
    symptom: "A Vercel diz que não encontrou o repositório do GitHub",
    cause: "A integração da Vercel com o GitHub ainda não tem permissão para acessar o repositório que você marcou como privado.",
    fix: "Na tela de importação da Vercel, clique no menu de contas > “Configure GitHub App” > selecione o repositório mapa-cotacao-gerencial e confirme.",
  },
  {
    symptom: "O link do Neon dá erro de timeout ou conexão recusada",
    cause: "Foi copiada a URL sem o pooler ou com sslmode incorreto.",
    fix: "No Neon, confirme que a caixinha 'Pooled connection' está marcada ao copiar a string e que a URL termina com ?sslmode=require.",
  },
];

export default function CentralAjudaPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[1040px] px-4 pb-20 pt-5 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-ink"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Painel de cotações
        </Link>

        {/* HERO */}
        <section className="relative mt-2 overflow-hidden rounded-2xl bg-ink px-5 py-7 text-white sm:px-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 85% 15%, rgba(250,177,42,0.6) 0, transparent 45%)",
            }}
          />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-deep">
              <SparklesIcon className="h-3 w-3" />
              Central de Guias Gerencial · 100% Grátis
            </p>
            <h1 className="font-display mt-3 max-w-2xl text-[28px] leading-[1.1] sm:text-[38px]">
              Como ativar a IA e colocar seu aplicativo no ar
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/70 sm:text-[14px]">
              Tudo o que você precisa saber, explicado em linguagem simples para leigos, sem enrolação e sem nenhum
              custo de mensalidade: Google Gemini (IA grátis), GitHub (guardar o código), Neon.tech (banco de dados)
              e Vercel (publicar na internet).
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11.5px] font-bold">
              <a href="#guia-ia" className="rounded-lg bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
                1 · Ativar IA Gratuita
              </a>
              <a href="#guia-github" className="rounded-lg bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
                2 · GitHub
              </a>
              <a href="#guia-neon" className="rounded-lg bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
                3 · Neon.tech (Banco)
              </a>
              <a href="#guia-vercel" className="rounded-lg bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
                4 · Vercel (No ar)
              </a>
            </div>
          </div>
        </section>

        {/* RESUMO DOS SERVIÇOS (TODOS GRÁTIS) */}
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              servico: "Google Gemini",
              funcao: "Inteligência Artificial",
              custo: "Grátis",
              tempo: "2 min",
              desc: "Lê PDFs e fotos de propostas e extrai tudo sozinho.",
            },
            {
              servico: "GitHub",
              funcao: "Guarda o código",
              custo: "Grátis",
              tempo: "3 min",
              desc: "Pasta segura na nuvem onde ficam os arquivos do app.",
            },
            {
              servico: "Neon.tech",
              funcao: "Banco de dados",
              custo: "Grátis",
              tempo: "2 min",
              desc: "Guarda os mapas, preços e dados dos condomínios.",
            },
            {
              servico: "Vercel",
              funcao: "Coloca na internet",
              custo: "Grátis",
              tempo: "3 min",
              desc: "Gera o link oficial do site com cadeado de segurança.",
            },
          ].map((item) => (
            <div key={item.servico} className="card p-3.5">
              <div className="flex items-start justify-between gap-1">
                <span className="font-extrabold text-ink">{item.servico}</span>
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[9.5px] font-extrabold uppercase text-success">
                  {item.custo}
                </span>
              </div>
              <p className="mt-0.5 text-[10.5px] font-bold text-brand-dark">{item.funcao}</p>
              <p className="mt-1 text-[11px] leading-snug text-slate-600">{item.desc}</p>
              <p className="mt-2 text-[10px] text-slate-400">Tempo estimado: {item.tempo}</p>
            </div>
          ))}
        </section>

        {/* -------------------------------------------------------- */}
        {/* GUIA 1: IA GOOGLE GEMINI                                 */}
        {/* -------------------------------------------------------- */}
        <section className="mt-10 scroll-mt-20" id="guia-ia">
          <div className="flex items-center gap-2 border-b-2 border-brand pb-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-xs font-black text-brand">
              1
            </span>
            <h2 className="font-display text-[22px] text-ink">
              Passo a Passo: Ativar a IA Gratuita (Google Gemini)
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-600">
            A IA que analisa os arquivos em PDF e JPG/PNG é o Google Gemini. O plano gratuito é muito generoso e não
            pede cartão de crédito.
          </p>

          <ol className="mt-4 space-y-3">
            {GEMINI_STEPS.map((step) => (
              <li key={step.n} className="card flex gap-3.5 px-4 py-4 sm:px-5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink text-[14px] font-extrabold text-brand">
                  {step.n}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-extrabold leading-tight text-ink">{step.title}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{step.body}</p>
                  {step.tip && (
                    <p className="mt-2 rounded-lg bg-brand-soft px-2.5 py-1.5 text-[11px] leading-snug text-brand-dark">
                      <span className="font-extrabold">Dica prática: </span>
                      {step.tip}
                    </p>
                  )}
                  {step.link &&
                    (step.link.internal ? (
                      <Link href={step.link.href} className="btn btn-brand mt-2.5">
                        {step.link.label}
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <a href={step.link.href} target="_blank" rel="noreferrer" className="btn btn-primary mt-2.5">
                        {step.link.label}
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </a>
                    ))}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* -------------------------------------------------------- */}
        {/* GUIA 2: GITHUB                                           */}
        {/* -------------------------------------------------------- */}
        <section className="mt-12 scroll-mt-20" id="guia-github">
          <div className="flex items-center gap-2 border-b-2 border-brand pb-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-xs font-black text-brand">
              2
            </span>
            <h2 className="font-display text-[22px] text-ink">
              Passo a Passo: Criar o Repositório no GitHub
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-600">
            O GitHub guarda os arquivos do seu aplicativo com segurança. Ele serve de ponte para a Vercel colocar o
            site no ar.
          </p>

          <ol className="mt-4 space-y-3">
            {GITHUB_STEPS.map((step) => (
              <li key={step.n} className="card flex gap-3.5 px-4 py-4 sm:px-5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink text-[14px] font-extrabold text-brand">
                  {step.n}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-extrabold leading-tight text-ink">{step.title}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{step.body}</p>
                  {step.tip && (
                    <p className="mt-2 rounded-lg bg-paper px-2.5 py-1.5 text-[11px] leading-snug text-slate-600">
                      <span className="font-extrabold text-ink">Importante: </span>
                      {step.tip}
                    </p>
                  )}
                  {step.link && (
                    <a href={step.link.href} target="_blank" rel="noreferrer" className="btn btn-primary mt-2.5">
                      {step.link.label}
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* -------------------------------------------------------- */}
        {/* GUIA 3: NEON.TECH                                        */}
        {/* -------------------------------------------------------- */}
        <section className="mt-12 scroll-mt-20" id="guia-neon">
          <div className="flex items-center gap-2 border-b-2 border-brand pb-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-xs font-black text-brand">
              3
            </span>
            <h2 className="font-display text-[22px] text-ink">
              Passo a Passo: Criar o Banco Gratuito no Neon.tech
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-600">
            O Neon é o cofre onde seus mapas, fornecedores e orçamentos ficam salvos. O plano gratuito oferece banco
            PostgreSQL rápido e robusto.
          </p>

          <ol className="mt-4 space-y-3">
            {NEON_STEPS.map((step) => (
              <li key={step.n} className="card flex gap-3.5 px-4 py-4 sm:px-5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink text-[14px] font-extrabold text-brand">
                  {step.n}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-extrabold leading-tight text-ink">{step.title}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{step.body}</p>
                  {step.tip && (
                    <p className="mt-2 rounded-lg bg-brand-soft px-2.5 py-1.5 text-[11px] leading-snug text-brand-dark">
                      <span className="font-extrabold">Como deve ser o link: </span>
                      {step.tip}
                    </p>
                  )}
                  {step.link && (
                    <a href={step.link.href} target="_blank" rel="noreferrer" className="btn btn-primary mt-2.5">
                      {step.link.label}
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* -------------------------------------------------------- */}
        {/* GUIA 4: VERCEL                                           */}
        {/* -------------------------------------------------------- */}
        <section className="mt-12 scroll-mt-20" id="guia-vercel">
          <div className="flex items-center gap-2 border-b-2 border-brand pb-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-xs font-black text-brand">
              4
            </span>
            <h2 className="font-display text-[22px] text-ink">
              Passo a Passo: Publicar o Site na Vercel
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-600">
            A Vercel conecta o GitHub ao Neon e publica seu aplicativo na internet com endereço próprio, certificado
            de segurança e alta velocidade.
          </p>

          <ol className="mt-4 space-y-3">
            {VERCEL_STEPS.map((step) => (
              <li key={step.n} className="card flex gap-3.5 px-4 py-4 sm:px-5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink text-[14px] font-extrabold text-brand">
                  {step.n}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-extrabold leading-tight text-ink">{step.title}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{step.body}</p>

                  {step.variables && (
                    <div className="mt-3 space-y-2 rounded-xl border border-line bg-paper p-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink">
                        Variáveis para cadastrar na Vercel:
                      </p>
                      {step.variables.map((v) => (
                        <div key={v.name} className="rounded-lg bg-white p-2.5 ring-1 ring-line">
                          <div className="flex items-center justify-between">
                            <code className="font-mono text-[12px] font-bold text-ink">{v.name}</code>
                            {v.required ? (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                                Obrigatória
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                                Opcional (pode pôr no painel)
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">{v.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.tip && (
                    <p className="mt-2 rounded-lg bg-brand-soft px-2.5 py-1.5 text-[11px] leading-snug text-brand-dark">
                      <span className="font-extrabold">Dica de ouro: </span>
                      {step.tip}
                    </p>
                  )}

                  {step.link && (
                    <a href={step.link.href} target="_blank" rel="noreferrer" className="btn btn-primary mt-2.5">
                      {step.link.label}
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* -------------------------------------------------------- */}
        {/* RESOLUÇÃO DE PROBLEMAS                                   */}
        {/* -------------------------------------------------------- */}
        <section className="mt-12">
          <h2 className="font-display text-[22px] text-ink">Deu algum erro durante o processo?</h2>
          <p className="mt-1 max-w-2xl text-[12.5px] text-slate-500">
            Veja as situações mais comuns ao publicar e como resolver em segundos:
          </p>
          <div className="mt-3 space-y-2.5">
            {DEPLOY_ERRORS.map((entry) => (
              <details key={entry.symptom} className="card group px-4 py-3 sm:px-5">
                <summary className="cursor-pointer list-none text-[13px] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-red-50 align-middle text-[11px] font-black text-red-500">
                    !
                  </span>
                  {entry.symptom}
                  <span className="ml-2 text-[10.5px] font-bold text-brand-dark group-open:hidden">
                    Ver como consertar →
                  </span>
                </summary>
                <div className="mt-2 space-y-1.5 border-t border-line pt-2 text-[12px] leading-relaxed">
                  <p className="text-slate-600">
                    <span className="font-bold text-ink">Por que isso acontece: </span>
                    {entry.cause}
                  </p>
                  <p className="rounded-lg bg-success-soft px-2.5 py-1.5 text-success">
                    <span className="font-bold">O que fazer: </span>
                    {entry.fix}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mt-12 overflow-hidden rounded-2xl bg-ink px-5 py-7 text-center text-white sm:px-8">
          <SparklesIcon className="mx-auto h-7 w-7 text-brand" />
          <h2 className="font-display mx-auto mt-2 max-w-lg text-[24px] leading-tight">
            Pronto para começar?
          </h2>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-white/70">
            Ative a IA no seu painel ou siga os 4 passos para colocar o site no ar na Vercel para todos os seus
            condomínios.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/configuracoes" className="btn btn-brand">
              Configurar IA Gratuita agora
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
            <Link href="/mapas/novo" className="btn border-white/20 bg-white/10 text-white hover:bg-white/20">
              Criar mapa manualmente
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
