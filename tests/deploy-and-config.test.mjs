import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

test("arquivos essenciais para deploy na Vercel existem na raiz", () => {
  const required = [
    ".env.example",
    ".gitignore",
    "drizzle.config.ts",
    "eslint.config.mjs",
    "next.config.ts",
    "package.json",
    "postcss.config.mjs",
    "README.md",
    "tsconfig.json",
    "vercel.json",
    "public/identidade/logo.png",
    "public/identidade/simbolo.png",
  ];
  for (const rel of required) {
    assert.ok(
      fs.existsSync(path.join(ROOT, rel)),
      `Arquivo obrigatório ausente: ${rel}`
    );
  }
});

test(".gitignore protege .env local contra commit acidental", () => {
  const content = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert.match(content, /^\.env$/m);
  assert.match(content, /^\/node_modules$/m);
  assert.match(content, /^\/\.next\/$/m);
  assert.match(content, /^!\.env\.example$/m);
});

test("vercel.json possui JSON válido e região configurada", () => {
  const raw = fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.framework, "nextjs");
  assert.ok(Array.isArray(parsed.regions) && parsed.regions.includes("gru1"));
});

test("cadeia de fallback do Gemini prioriza gemini-4-hydrogen e gemini-3.5-flash-lite", () => {
  const content = fs.readFileSync(path.join(ROOT, "src/lib/gemini-transport.ts"), "utf8");
  const idxH = content.indexOf('"gemini-4-hydrogen"');
  const idxF = content.indexOf('"gemini-3.5-flash-lite"');
  assert.ok(idxH > 0, "gemini-4-hydrogen deve estar listado");
  assert.ok(idxF > idxH, "gemini-3.5-flash-lite deve vir logo após gemini-4-hydrogen");
});

test("src/db/index.ts não lança erro no top-level quando DATABASE_URL está ausente", () => {
  const content = fs.readFileSync(path.join(ROOT, "src/db/index.ts"), "utf8");
  assert.ok(
    content.includes("POSTGRES_URL"),
    "deve aceitar POSTGRES_URL como alternativa à DATABASE_URL"
  );
  assert.ok(
    content.includes("rejectUnauthorized: false"),
    "deve configurar SSL para bancos PostgreSQL na nuvem"
  );
  assert.ok(
    content.includes("new Proxy("),
    "export `db` deve usar inicialização lazy para não quebrar next build"
  );
});
