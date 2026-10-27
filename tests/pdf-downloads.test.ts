import "dotenv/config";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { documentDownloads } from "../src/db/schema";
import { createQuotation, deleteQuotation } from "../src/lib/server/quotations";
import { deleteCondominium } from "../src/lib/server/condominiums";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const testNames: string[] = [];
const testQuotationIds: string[] = [];
const testCondominiumIds: string[] = [];

async function testQuotation() {
  const condominium = `Condomínio PDF ${suffix}`;
  const quotation = await createQuotation({
    status: "concluido",
    condominium,
    analysisDate: "2026-10-20",
    recipient: "Conselho de teste",
    service: "Instalação de luminárias",
    description: "Mapa de teste de geração de PDF e registro do nome do arquivo.",
    kind: "servico",
    category: "Elétrica",
    suppliers: [
      { id: `a-${suffix}`, name: "Fornecedor Alfa", contact: "alfa@example.test", deliveryDays: "5 dias", paymentTerms: "30 dias", validity: "30 dias", notes: "" },
      { id: `b-${suffix}`, name: "Fornecedor Bravo", contact: "bravo@example.test", deliveryDays: "7 dias", paymentTerms: "à vista", validity: "15 dias", notes: "" },
    ],
    items: [
      { id: `item-1-${suffix}`, description: "Mão de obra de instalação", unit: "serviço", quantity: 2, costType: "mao_obra", prices: { [`a-${suffix}`]: 100, [`b-${suffix}`]: 120 } },
      { id: `item-2-${suffix}`, description: "Luminária LED", unit: "un", quantity: 4, costType: "material", prices: { [`a-${suffix}`]: 35, [`b-${suffix}`]: 30 } },
    ],
    analysis: { summary: "Resumo de teste", recommendation: "Revisar antes de contratar", notes: "PDF gerado automaticamente." },
    attachments: [],
  });
  testQuotationIds.push(quotation.id);
  return quotation;
}

test("download do mapa gera PDF e registra o nome exato no banco", async () => {
  const quotation = await testQuotation();
  const { GET } = await import("../src/app/api/quotations/[id]/pdf/route");
  const response = await GET(new Request("http://localhost/api"), { params: Promise.resolve({ id: quotation.id }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/pdf/);
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+\.pdf)"/.exec(disposition);
  assert.ok(match, "O cabeçalho do PDF deve informar o nome do arquivo.");
  const pdf = Buffer.from(await response.arrayBuffer());
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdf.length > 1_000, "O PDF do mapa deve conter o documento gerado.");
  const rows = await db.select().from(documentDownloads).where(eq(documentDownloads.fileName, match[1]));
  testNames.push(match[1]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].documentType, "mapa_cotacao");
  assert.equal(rows[0].quotationId, quotation.id);
  console.log(`PDF do mapa conferido: ${rows[0].fileName} (${pdf.length} bytes).`);
});

test("download dos indicadores respeita filtros e registra nome e filtros", async () => {
  if (testQuotationIds.length === 0) await testQuotation();
  const quotation = await import("@/lib/server/quotations").then((module) => module.getQuotation(testQuotationIds[0]));
  assert.ok(quotation);
  const { GET } = await import("../src/app/api/indicadores/pdf/route");
  const url = new URL("http://localhost/api/indicadores/pdf");
  url.searchParams.set("condominio", quotation.condominium);
  url.searchParams.set("inicio", quotation.analysisDate);
  url.searchParams.set("fim", quotation.analysisDate);
  const response = await GET(new Request(url));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/pdf/);
  const match = /filename="([^"]+\.pdf)"/.exec(response.headers.get("content-disposition") ?? "");
  assert.ok(match);
  const pdf = Buffer.from(await response.arrayBuffer());
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdf.length > 1_000);
  const rows = await db.select().from(documentDownloads).where(eq(documentDownloads.fileName, match[1]));
  testNames.push(match[1]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].documentType, "indicadores");
  assert.deepEqual(rows[0].filters, { condominium: quotation.condominium, start: quotation.analysisDate, end: quotation.analysisDate, quotationCount: 1 });
  console.log(`PDF do dashboard conferido: ${rows[0].fileName} (${pdf.length} bytes), filtros gravados.`);
});

after(async () => {
  if (testNames.length) {
    for (const fileName of testNames) await db.delete(documentDownloads).where(eq(documentDownloads.fileName, fileName));
  }
  for (const id of testQuotationIds) await deleteQuotation(id);
  for (const id of testCondominiumIds) await deleteCondominium(id);
  // O cadastro do condomínio é criado automaticamente ao criar a cotação.
  const { listCondominiums } = await import("@/lib/server/quotations");
  const condos = await listCondominiums();
  for (const condo of condos.filter((entry) => entry.name === `Condomínio PDF ${suffix}`)) await deleteCondominium(condo.id);
  await (await import("@/db")).pool.end();
});
