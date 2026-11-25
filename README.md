# Gerencial — Mapa de Cotação

Plataforma de governança condominial da **Gerencial** para elaborar, comparar
e aprovar **mapas de cotação** com apoio de **inteligência artificial gratuita**
(Google Gemini). A aplicação gera documentos institucionais prontos para
assembleia/conselho, assinatura e anexo ao processo de compras do condomínio.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) + React |
| Banco | PostgreSQL + Drizzle ORM |
| Estilização | Tailwind CSS v4 |
| Documentos | `pdf-lib` (PDF institucional A4) |
| IA | Google Gemini API (cota gratuita) |
| Testes | `node:test` + `tsx` |

## Estrutura

```text
src/
  app/                 # Rotas
    page.tsx           # Painel (KPIs, filtros de busca, tabela de mapas)
    mapas/novo/        # Novo mapa (contexto + leitura com IA + texto colado)
    mapas/[id]/        # Editor e visualizador do documento institucional
    condominios/       # Base de condomínios e associações (cadastro por CNPJ)
    indicadores/       # Dashboard de assembleia (CSV/PDF/impressão)
    configuracoes/     # Configuração da chave gratuita do Gemini
    ajuda/             # Central de ajuda e guia ilustrado da IA
    api/               # Rotas REST (mapas, condomínios, IA, CNPJ, PDFs)
  components/          # UI compartilhada (editor, painel IA, documento, etc.)
  db/                  # Schema Drizzle + seed automático
  lib/                 # Lógica: cálculos, PDF, Gemini, CNPJ, logo embutida
tests/                 # Testes unitários (node:test)
public/identidade/     # Identidade visual (logo, símbolo)
```

## Configuração

1. Copie `.env.example` para `.env` e preencha:
   - `DATABASE_URL` — conexão PostgreSQL (obrigatória)
   - `GEMINI_API_KEY` — chave gratuita do Google AI Studio (opcional)
   - `GEMINI_MODEL` — modelo principal usado na leitura (padrão `gemini-4-hydrogen`)
2. Instale as dependências e aplique o schema:

```bash
npm install
npx drizzle-kit push
```

3. Rode o servidor local:

```bash
npm run dev   # http://localhost:3000
```

Na Vercel, configure a mesma variável `DATABASE_URL` no painel do projeto
(Settings → Environment Variables). Os arquivos `.env*` são ignorados pelo
`.gitignore` e nunca são publicados. O seed inicial (condomínios, mapas de
exemplo, histórico de PDFs) roda **automaticamente na primeira requisição** com
banco vazio.

## Rotas principais

| Rota | Descrição |
|---|---|
| `/` | Painel: KPIs, último mapa, tabela de mapas com busca por campo, barra lateral |
| `/mapas/novo` | Criação de novo mapa (IA gratuita ou texto colado) |
| `/mapas/[id]` | Editor completo + pré-visualização do documento + download de PDF |
| `/condominios` | Cadastro completo com consulta por CNPJ na Receita Federal |
| `/indicadores` | Dashboard para assembleia (CSV, PDF, impressão) |
| `/configuracoes` | Conexão e teste da chave gratuita do Google Gemini |
| `/ajuda` e `/ajuda/ia` | Central de ajuda + guia ilustrado de 2 minutos |

## Fluxo de leitura com IA

1. Anexe PDFs/fotos (até 6 arquivos) ou cole o texto das propostas;
2. O sistema chama o Gemini com **alternância automática de modelos**:
   `gemini-4-hydrogen` → `gemini-3.5-flash-lite` → `gemini-3.8-flash` →
   `gemini-3.1-flash-lite` → `gemini-2.5-flash-lite`, com retry em erros 429/5xx;
3. A IA retorna fornecedores, itens, quantidades e preços unitários, que são
   fundidos ao mapa automaticamente.

Sem a IA configurada, a plataforma funciona normalmente com texto colado e
preenchimento manual.

## Testes

```bash
npx tsx --test tests/*.test.ts
```

## Deploy (Vercel)

1. `npx drizzle-kit push` apontando para o banco de produção;
2. Configure `DATABASE_URL` (e opcionalmente `GEMINI_API_KEY` e `GEMINI_MODEL`)
   nas variáveis de ambiente do projeto Vercel;
3. Faça o deploy do repositório — o app é verde no build mesmo sem variáveis
   (as páginas mostram um estado amigável) e fica funcional assim que
   `DATABASE_URL` é definido.
