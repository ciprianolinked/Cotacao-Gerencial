# Gerencial · Mapa de Cotação

Plataforma de governança condominial da **Gerencial** para elaborar, comparar, apresentar em assembleia e aprovar mapas de cotação com apoio de inteligência artificial gratuita (Google Gemini).

## Principais funcionalidades

- **Painel de cotações (`/`)**: resumo do portfólio, economia potencial, filtro por status e busca dedicada por campo (protocolo, condomínio, objeto, descrição, categoria, data, fornecedor, melhor valor, economia ou status).
- **Novo mapa com IA (`/mapas/novo`)**: leitura automática de PDFs e fotos (JPG, PNG, WEBP) com alternância automática entre modelos do Google Gemini (`gemini-4-hydrogen` → `gemini-3.5-flash-lite` → `gemini-3.8-flash` → `gemini-3.1-flash-lite` → `gemini-2.5-flash-lite`) para contornar erros 503/lentidão, além de leitor de texto colado sem IA e criação em branco.
- **Editor e documento institucional (`/mapas/[id]`)**:
  - Cabeçalho editável (condomínio, data, A/C, objeto, natureza Serviço/Produtos e categoria);
  - Até 5 fornecedores com condições comerciais, links de compra e selo *Loja confiável*;
  - Tabela comparativa por item com classificação de custo (`Mão de obra`, `Material`, `Não discriminado`), destaque automático do menor preço e totais em tempo real;
  - Parecer técnico e recomendação automáticos (editáveis);
  - Registro de resultado confirmado da contratação;
  - Pré-visualização `.doc-sheet`, impressão A4 pelo navegador e geração de PDF real no servidor (`pdf-lib`).
- **Base de condomínios (`/condominios`)**: cadastro e edição com busca automática de dados pelo **CNPJ** (Receita Federal via BrasilAPI com fallback ReceitaWS).
- **Indicadores para assembleia (`/indicadores`)**: filtros por condomínio e período, economia confirmada vs. potencial, evolução mensal, composição por tipo de custo, histórico de PDFs baixados, exportação CSV, PDF e impressão.
- **Configuração de IA (`/configuracoes`)** e **Central de ajuda (`/ajuda`, `/ajuda/ia`)**.

## Estrutura do projeto

```text
├── public/                 # Identidade visual (logo.png, simbolo.png, favicon.ico)
├── src/
│   ├── app/                # Rotas Next.js App Router e APIs (/api/*)
│   ├── components/         # Interface cliente e folha de documento institucional
│   ├── db/                 # Conexão PostgreSQL (lazy + SSL), schema Drizzle, bootstrap e seed
│   └── lib/                # Cálculos, integração Gemini com fallback, gerador de PDF
├── tests/                  # Testes automatizados (node --test)
├── .env.example            # Modelo de variáveis de ambiente
├── .gitignore              # Ignora .env local, .next, node_modules e .vercel
├── drizzle.config.ts       # Configuração do Drizzle Kit (lê DATABASE_URL/POSTGRES_URL)
├── next.config.ts          # Next.js + empacotamento de assets para funções serverless
└── vercel.json             # Região gru1 (São Paulo) e headers HTTP na Vercel
```

## Executando localmente

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`:
   ```bash
   cp .env.example .env
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. (Opcional) Sincronize o schema manualmente com o Drizzle Kit — o aplicativo também cria/atualiza tabelas automaticamente na primeira requisição:
   ```bash
   npx drizzle-kit push
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Execute os testes:
   ```bash
   node --test tests/*.test.mjs
   ```

## Deploy na Vercel

1. **Nunca faça commit do arquivo `.env` local** (ele já está listado no `.gitignore`).
2. Na Vercel, importe o repositório GitHub normalmente (framework detectado automaticamente: **Next.js**).
3. Conecte um banco PostgreSQL gerenciado (**Neon**, **Supabase** ou **Vercel Postgres / Prisma Postgres**) e configure em **Project Settings → Environment Variables**:
   - `DATABASE_URL` *(ou `POSTGRES_URL` — reconhecida automaticamente)*
   - `GEMINI_API_KEY` *(opcional: também pode ser configurada em `/configuracoes`)*
   - `GEMINI_MODEL` *(opcional, padrão `gemini-4-hydrogen`)*
4. Faça o deploy. Na primeira requisição, o bootstrap automático (`src/db/bootstrap.ts`) cria todas as tabelas e colunas que faltarem (inclusive `cnpj` e `contact_phone`) e valida a conexão.
5. Verifique o status de produção em `/api/health`.

## Correção de salvamento de chave e identidade visual

- `POST /api/ai/config` **somente salva** a chave e o modelo em uma transação PostgreSQL. Não aguarda o Google. A resposta `saved: true` confirma a persistência.
- A tela então faz um `PUT /api/ai/config` independente para testar a conexão. Se o Google demorar ou retornar erro, a chave continua salva e a interface distingue as duas etapas.
- **Testar conexão** usa a chave digitada quando o campo está preenchido. Com o campo vazio, testa a configuração cadastrada. Testar uma chave nova não a salva automaticamente.
- O modelo que responder com a chave cadastrada é memorizado para as próximas leituras. Regravar a mesma chave não redefine esse modelo. As alternativas dependem da disponibilidade da conta Google.
- As tentativas possuem prazo individual e prazo **total** (teste: até 22 segundos; leitura/busca: até 40 segundos por chamada, dentro de um prazo compartilhado da rota). A rota de configuração permite 60 segundos, com margem para acesso ao banco e resposta JSON.
- Respostas textuais/HTML da infraestrutura, inclusive `FUNCTION_INVOCATION_TIMEOUT`, são tratadas sem mostrar `Unexpected token` nem conteúdo bruto ao usuário. Logs de configuração registram apenas código e identificador de diagnóstico; nunca chave, SQL ou parâmetros.
- A configuração de IA verifica apenas sua tabela de configurações; não aguarda o bootstrap completo dos mapas durante cada operação de credenciais.
- A logo e o símbolo oficiais estão incorporados em `src/lib/brand-assets.ts`. O componente `BrandLogo`, os PDFs e `/api/brand/logo` / `/api/brand/simbolo` usam esses bytes originais. Assim, continuam disponíveis mesmo se uma exportação omitir arquivos binários de `public/`. Não remova esse módulo ao publicar.

### Testes de regressão

- `node --test tests/*.test.mjs` — testes unitários, respostas não JSON, fallback, prazos totais e integridade da marca.
- `RUN_DB_TESTS=1 node --test tests/ai-config-regression.test.mjs` — testes com PostgreSQL **de desenvolvimento**. Usam chaves sintéticas e chamadas Google simuladas; restauram os registros de configuração ao terminar. Não execute contra um banco de produção.
- Com a aplicação já iniciada: `npx playwright install chromium` e `node tests/configuration.browser.mjs` — verifica salvar/testar, resposta de timeout da Vercel, campo preservado após falha e carregamento da logo no desktop/mobile. As chamadas de configuração são simuladas no navegador, sem alterar uma chave real.

A aprovação dos testes locais não substitui os logs da publicação na Vercel. Publique o código atualizado e use o identificador de referência mostrado pela interface para investigar eventuais falhas específicas do ambiente.
