import "dotenv/config";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  buildNarrative,
  computeMetrics,
  createEmptyDraft,
  inferNature,
  normalizeDraft,
  normalizeNature,
} from "../src/lib/quotation";

/** Monta um mapa com 3 fornecedores e itens de material e mão de obra. */
function draftComPropostas() {
  const draft = createEmptyDraft({ condominium: "Residencial Teste", service: "Reparo hidráulico" });
  const [a, b, c] = draft.suppliers;
  draft.items = [
    {
      id: "i1",
      description: "Tubo PVC 25mm",
      unit: "un",
      quantity: 10,
      nature: "material",
      prices: { [a.id]: 10, [b.id]: 12, [c.id]: 11 },
    },
    {
      id: "i2",
      description: "Instalação hidráulica",
      unit: "serviço",
      quantity: 1,
      nature: "mao_de_obra",
      prices: { [a.id]: 400, [b.id]: 300, [c.id]: 500 },
    },
  ];
  return { draft, a, b, c };
}

test("classifica material e mão de obra pela descrição e unidade", () => {
  assert.equal(inferNature("Tubo PVC 25mm", "un"), "material");
  assert.equal(inferNature("Cabo flexível 2,5mm", "un"), "material");
  assert.equal(inferNature("Instalação de bomba", "serviço"), "mao_de_obra");
  assert.equal(inferNature("Hora técnica do eletricista", "hora"), "mao_de_obra");
  assert.equal(inferNature("Manutenção preventiva mensal", "mês"), "mao_de_obra");
  // Valor vindo da IA tem prioridade sobre a dedução.
  assert.equal(normalizeNature("mao_de_obra", "Tubo PVC", "un"), "mao_de_obra");
  assert.equal(normalizeNature("material", "Instalação", "serviço"), "material");
  // Sem informação, deduz pela descrição.
  assert.equal(normalizeNature(undefined, "Tubo PVC", "un"), "material");
  // Ação prevalece sobre o material citado.
  assert.equal(inferNature("Troca de filtro da piscina", "serviço"), "mao_de_obra");
  assert.equal(inferNature("Substituição do motor do portão", "un"), "mao_de_obra");
  // Quando não dá para separar, fica como "outros".
  assert.equal(inferNature("Fornecimento de material e mão de obra", "vb (verba)"), "outros");
  assert.equal(inferNature("Bomba submersa 1/2 CV", "un"), "material");
});

test("separa os totais de material e mão de obra por fornecedor", () => {
  const { draft, a, b } = draftComPropostas();
  const metrics = computeMetrics(draft);

  const rankA = metrics.rankings.find((row) => row.supplier.id === a.id);
  assert.equal(rankA?.total, 500); // 10x10 material + 400 mão de obra
  assert.equal(rankA?.byNature.material, 100);
  assert.equal(rankA?.byNature.mao_de_obra, 400);

  const rankB = metrics.rankings.find((row) => row.supplier.id === b.id);
  assert.equal(rankB?.total, 420); // 10x12 + 300
  assert.equal(rankB?.byNature.material, 120);
  assert.equal(rankB?.byNature.mao_de_obra, 300);

  // Melhor proposta é a B (420) contra a pior, a C (610).
  assert.equal(metrics.best?.supplier.id, b.id);
  assert.equal(metrics.savings, 190);
  assert.equal(metrics.bestByNature.material, 120);
  assert.equal(metrics.bestByNature.mao_de_obra, 300);

  // Economia por natureza: material 120-100=20, mão de obra 500-300=200.
  assert.equal(metrics.savingsByNature.material, 20);
  assert.equal(metrics.savingsByNature.mao_de_obra, 200);
});

test("o resumo acompanha os valores e cita material e mão de obra", () => {
  const { draft, b } = draftComPropostas();
  const narrative = buildNarrative(draft);
  assert.match(narrative.summary, /R\$\s*420,00/);
  assert.match(narrative.summary, /material/i);
  assert.match(narrative.summary, /mão de obra/i);
  assert.match(narrative.recommendation, new RegExp(b.name));

  // Ao baixar o preço de outro fornecedor, o resumo muda de recomendado.
  const alterado = {
    ...draft,
    items: draft.items.map((item) => ({ ...item, prices: { ...item.prices, [draft.suppliers[0].id]: 1 } })),
  };
  const novo = buildNarrative(alterado);
  assert.notEqual(novo.summary, narrative.summary);
  assert.match(novo.recommendation, new RegExp(draft.suppliers[0].name));
});

test("mapas antigos sem natureza continuam válidos e recebem classificação", () => {
  const legado = normalizeDraft({
    condominium: "Antigo",
    analysisDate: "2026-01-10",
    suppliers: [{ id: "s1", name: "Forn 1" }],
    items: [
      { id: "i1", description: "Tubo PVC", unit: "un", quantity: 2, prices: { s1: 10 } },
      { id: "i2", description: "Mão de obra de instalação", unit: "serviço", quantity: 1, prices: { s1: 90 } },
    ],
  });
  assert.equal(legado.items[0].nature, "material");
  assert.equal(legado.items[1].nature, "mao_de_obra");
  assert.equal(computeMetrics(legado).rankings[0].byNature.material, 20);
  assert.equal(computeMetrics(legado).rankings[0].byNature.mao_de_obra, 90);
});

test("mapa sem preços não inventa economia", () => {
  const draft = createEmptyDraft();
  const metrics = computeMetrics(draft);
  assert.equal(metrics.best, null);
  assert.equal(metrics.savings, 0);
  assert.equal(metrics.savingsByNature.material, 0);
  assert.match(buildNarrative(draft).summary, /Mapa em elaboração/i);
});

after(async () => {
  const { pool } = await import("../src/db");
  await pool.end();
});
