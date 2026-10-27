// Verificação manual contra a API real do Google. Não roda no CI.
// Uso: GEMINI_API_KEY=... npx tsx tests/manual-extracao.ts arquivo1.pdf arquivo2.pdf
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { extractQuotation } from "../src/lib/ai";

(async () => {
  const paths = process.argv.slice(2);
  if (!paths.length) throw new Error("Informe ao menos um arquivo PDF ou imagem.");
  const files = paths.map((p) => ({
    name: path.basename(p),
    type: p.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    size: fs.statSync(p).size,
    base64: fs.readFileSync(p).toString("base64"),
  }));
  const started = Date.now();
  const result = await extractQuotation({ files, text: "", hints: {} });
  console.log(`\n=== RESULTADO em ${((Date.now() - started) / 1000).toFixed(1)}s ===`);
  console.log("modo:", result.mode, "| provedor:", result.provider);
  console.log("condomínio:", result.draft.condominium || "(vazio)");
  console.log("fornecedores:", result.draft.suppliers.map((s) => s.name).join(" | "));
  for (const item of result.draft.items) {
    const prices = result.draft.suppliers.map((s) => item.prices[s.id]).join(" / ");
    console.log(`  • ${item.description} | ${item.quantity} ${item.unit} | ${prices}`);
  }
  console.log("avisos:", result.warnings.length ? result.warnings.join(" ; ") : "(nenhum)");
  const { pool } = await import("../src/db");
  await pool.end();
})();
