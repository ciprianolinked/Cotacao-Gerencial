import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeSummary,
  formatCurrency,
  generateAutomaticAnalysis,
  itemTotal,
  lowestPriceForItem,
  parseDecimalBR,
  recordedSavings,
  sanitizeSlug,
} from "@/lib/calculations";
import type { QuotationData } from "@/lib/types";

function makeQuotation(overrides: Partial<QuotationData> = {}): QuotationData {
  return {
    status: "em_analise",
    condominium: "Condomínio Teste",
    analysisDate: "2026-11-25",
    recipient: "Síndico(a) e Conselho Consultivo",
    service: "Teste de numeração",
    description: "Cotação de 2 itens para teste",
    kind: "servico",
    category: "Manutenção predial",
    suppliers: [
      {
        id: "s1",
        name: "Fornecedor A",
        contact: "",
        deliveryDays: "",
        paymentTerms: "",
        validity: "",
        notes: "",
      },
      {
        id: "s2",
        name: "Fornecedor B",
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
        description: "Item 1",
        unit: "serviço",
        quantity: 2,
        prices: { s1: 100, s2: 120 },
        costType: "nao_discriminado",
      },
      {
        id: "i2",
        description: "Item 2",
        unit: "serviço",
        quantity: 1,
        prices: { s1: 50, s2: 40 },
        costType: "mao_obra",
      },
    ],
    analysis: {
      summary: "",
      recommendation: "",
      notes: "",
      outcome: {
        supplierId: "",
        referenceAmount: null,
        contractedAmount: null,
        confirmed: false,
      },
    },
    attachments: [],
    ...overrides,
  };
}

describe("parseDecimalBR", () => {
  it("interpreta valores em formato pt-BR", () => {
    assert.equal(parseDecimalBR("304,18"), 304.18);
    assert.equal(parseDecimalBR("22.500,00"), 22500);
    assert.equal(parseDecimalBR("22.500"), 22500);
    assert.equal(parseDecimalBR("1,50"), 1.5);
  });

  it("interpreta valores simples com ponto decimal", () => {
    assert.equal(parseDecimalBR("304.18"), 304.18);
    assert.equal(parseDecimalBR("42.5"), 42.5);
  });

  it("retorna null para entrada inválida ou vazia", () => {
    assert.equal(parseDecimalBR(""), null);
    assert.equal(parseDecimalBR("abc"), null);
    assert.equal(parseDecimalBR("R$"), null);
  });
});

describe("formatCurrency", () => {
  it("formata em R$ com separador brasileiro", () => {
    const normalize = (v: string) => v.replace(/\u00a0/g, " ");
    assert.equal(normalize(formatCurrency(608.36)), "R$ 608,36");
    assert.equal(normalize(formatCurrency(22500)), "R$ 22.500,00");
  });

  it("retorna traço para nulos ou não finitos", () => {
    assert.equal(formatCurrency(null), "—");
    assert.equal(formatCurrency(undefined), "—");
    assert.equal(formatCurrency(NaN), "—");
  });
});

describe("sanitizeSlug", () => {
  it("remove acentos e caracteres especiais", () => {
    assert.equal(
      sanitizeSlug("Associação dos Proprietários do Entreserras Santa Isabel"),
      "Associacao-dos-Proprietarios-do-Entreserras-Santa-Isabel"
    );
  });
});

describe("computeSummary", () => {
  it("soma quantidades × preços por fornecedor e identifica o melhor total", () => {
    const q = makeQuotation();
    const summary = computeSummary(q);
    const a = summary.rankings.find((r) => r.supplier.id === "s1");
    const b = summary.rankings.find((r) => r.supplier.id === "s2");
    // s1: 2*100 + 1*50 = 250; s2: 2*120 + 1*40 = 280
    assert.equal(a?.total, 250);
    assert.equal(b?.total, 280);
    assert.equal(summary.best?.supplier.id, "s1");
    assert.equal(summary.savings, 30);
    assert.equal(summary.isComparable, true);
  });

  it("não marca como comparável com cobertura incompleta", () => {
    const q = makeQuotation({
      items: [
        {
          id: "i1",
          description: "Item 1",
          unit: "serviço",
          quantity: 1,
          prices: { s1: 100, s2: null },
          costType: "nao_discriminado",
        },
      ],
    });
    const summary = computeSummary(q);
    assert.equal(summary.isComparable, false);
    assert.equal(summary.savings, 0);
  });
});

describe("lowestPriceForItem e itemTotal", () => {
  it("encontra o menor preço unitário corretamente", () => {
    const q = makeQuotation();
    const item = q.items[0];
    assert.equal(lowestPriceForItem(item, q.suppliers), 100);
    assert.equal(itemTotal(item, "s1"), 200);
    assert.equal(itemTotal(item, "s2"), 240);
  });
});

describe("recordedSavings", () => {
  it("retorna null enquanto resultado não está confirmado", () => {
    const q = makeQuotation();
    assert.equal(recordedSavings(q), null);
  });

  it("calcula a diferença quando confirmado e concluído", () => {
    const q = makeQuotation({
      status: "concluido",
      analysis: {
        summary: "",
        recommendation: "",
        notes: "",
        outcome: {
          supplierId: "s1",
          referenceAmount: 300,
          contractedAmount: 240,
          confirmed: true,
        },
      },
    });
    assert.equal(recordedSavings(q), 60);
  });
});

describe("generateAutomaticAnalysis", () => {
  it("redige parecer citando o melhor fornecedor", () => {
    const q = makeQuotation();
    const { summary, recommendation } = generateAutomaticAnalysis(q);
    assert.ok(summary.includes("Fornecedor A"));
    assert.ok(summary.includes("R$"));
    assert.ok(recommendation.includes("Fornecedor A"));
  });
});
