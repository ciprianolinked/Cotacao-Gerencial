import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateIndicatorsPdf,
  generateQuotationPdf,
} from "@/lib/pdf-generator";
import type { QuotationRecord } from "@/lib/types";

function makeQuotation(): QuotationRecord {
  return {
    id: "b1f2a2c4-0000-0000-0000-000000000001",
    protocol: "MC-2026-9999",
    status: "em_analise",
    condominium: "Condomínio Teste",
    analysisDate: "2026-11-25",
    recipient: "Síndico(a) e Conselho Consultivo",
    service: "Teste de PDF",
    description: "Descrição do escopo para teste de geração de PDF.",
    kind: "servico",
    category: "Manutenção predial",
    suppliers: [
      {
        id: "s1",
        name: "Fornecedor Alpha",
        contact: "contato@alpha.com.br",
        deliveryDays: "10 dias",
        paymentTerms: "28 dias",
        validity: "30 dias",
        notes: "Observação",
      },
      {
        id: "s2",
        name: "Fornecedor Beta",
        contact: "",
        deliveryDays: "",
        paymentTerms: "",
        validity: "",
        notes: "",
      },
    ],
    items: [
      {
        id: "i1",
        description: "Item de teste do PDF",
        unit: "serviço",
        quantity: 1,
        prices: { s1: 100, s2: 150 },
        costType: "nao_discriminado",
      },
    ],
    analysis: {
      summary: "Resumo de teste",
      recommendation: "Recomendação de teste",
      notes: "Observação do teste",
      outcome: {
        supplierId: "",
        referenceAmount: null,
        contractedAmount: null,
        confirmed: false,
      },
    },
    attachments: [],
    createdAt: "2026-11-25T00:00:00.000Z",
    updatedAt: "2026-11-25T00:00:00.000Z",
  };
}

describe("generateQuotationPdf", () => {
  it("gera um PDF válido no padrão A4 institucional", async () => {
    const pdf = await generateQuotationPdf(makeQuotation());
    assert.ok(pdf instanceof Uint8Array || Buffer.isBuffer(pdf));
    assert.ok(pdf.length > 2000, "PDF não pode ser vazio");
    const head = Buffer.from(pdf).subarray(0, 5).toString("latin1");
    assert.equal(head, "%PDF-");
  });
});

describe("generateIndicatorsPdf", () => {
  it("gera um PDF de indicadores válido", async () => {
    const pdf = await generateIndicatorsPdf({
      quotations: [makeQuotation()],
      condominiumFilter: "",
      startDate: "",
      endDate: "",
    });
    const head = Buffer.from(pdf).subarray(0, 5).toString("latin1");
    assert.equal(head, "%PDF-");
    assert.ok(pdf.length > 2000);
  });
});
