import { sql } from "drizzle-orm";
import { db } from "./index";
import { condominiums, pdfDownloads, quotations } from "./schema";
import { generateAutomaticAnalysis } from "@/lib/calculations";
import type { QuotationData } from "@/lib/types";

let seedPromise: Promise<void> | null = null;

function buildSeedMap(
  protocol: string,
  data: Omit<QuotationData, "analysis"> & { notes?: string }
) {
  const full: QuotationData = {
    ...data,
    analysis: {
      summary: "",
      recommendation: "",
      notes: data.notes ?? "",
      outcome: {
        supplierId: "",
        referenceAmount: null,
        contractedAmount: null,
        confirmed: false,
      },
    },
  };
  const auto = generateAutomaticAnalysis(full);
  full.analysis.summary = auto.summary;
  full.analysis.recommendation = auto.recommendation;
  return { protocol, data: full };
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      console.error("Seed error:", err);
    });
  }
  await seedPromise;
}

async function runSeed(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotations);

  if (count > 0) return;

  const condoRows = [
    {
      name: "Apesi - Associação dos Proprietários do Entreserras Santa Isabel",
      city: "Santa Isabel",
      manager: "Gilcimar",
      contactEmail: null,
    },
    {
      name: "Associação dos Adquirentes de Lotes no Loteamento Vale Industrial Paulista",
      city: "Jacareí",
      manager: "Eder",
      contactEmail: null,
    },
    {
      name: "RESIDENCIAL PARAISO DO SUL",
      city: "São José dos Campos",
      manager: "Samuel Costa",
      contactEmail: "atendimento3@gerencialcond.com.br",
    },
    {
      name: "Edifício Alta Vista",
      city: "São José dos Campos",
      manager: "Conselho Consultivo",
      contactEmail: null,
    },
    {
      name: "Associação dos Proprietários do Village Paraibuna",
      city: "Paraibuna / SP",
      manager: "João Carlos",
      contactEmail: "financeiro@gerencialcond.com.br",
    },
    {
      name: "Matiss Vila Ema",
      city: "São José dos Campos",
      manager: "Gerencial",
      contactEmail: "atendimento2@gerencialcond.com.br",
    },
  ];

  for (const c of condoRows) {
    await db
      .insert(condominiums)
      .values(c)
      .onConflictDoNothing({ target: condominiums.name });
  }

  const seedMaps = [
    buildSeedMap("MC-2026-0005", {
      status: "em_analise",
      condominium:
        "Apesi - Associação dos Proprietários do Entreserras Santa Isabel",
      analysisDate: "2026-11-09",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "Aquisição de Arandela Solar",
      description:
        "Aquisição de Arandela Solar Integrada ASI 500 Intelbras com sensor de presença.",
      kind: "produtos",
      category: "Elétrica",
      suppliers: [
        {
          id: "sup_a_0005",
          name: "Home Center Castelo Forte",
          contact: "E-commerce",
          deliveryDays: "Até 10 dias úteis",
          paymentTerms: "12x de R$ 33,42 com juros",
          validity: "Preço variável conforme estoque",
          notes: "Vendido e entregue por Benoit. Frete R$ 24,54.",
          purchaseUrl:
            "https://www.benoit.com.br/arandela-solar-integrada-intelbras-asi-500-dual-color-105170-3407/p",
          purchaseStore: "",
          purchaseVerified: false,
          purchaseSource: "manual",
        },
        {
          id: "sup_b_0005",
          name: "Casas Bahia",
          contact: "E-commerce",
          deliveryDays: "Até 10 dias úteis",
          paymentTerms: "Até 6x de R$ 84,64 sem juros",
          validity: "Preço variável conforme estoque",
          notes: "Vendido e entregue por WebContinental. Frete R$ 60,67.",
          purchaseUrl:
            "https://www.casasbahia.com.br/arandela-solar-integrada-asi-500-dual-color-4842814/p/1582441543",
          purchaseStore: "Casas Bahia",
          purchaseVerified: true,
          purchaseSource: "manual",
        },
        {
          id: "sup_c_0005",
          name: "Mercado Livre",
          contact: "Site, Televendas ou WhatsApp",
          deliveryDays: "Frete grátis expresso",
          paymentTerms: "À vista ou parcelado no cartão",
          validity: "Preço variável conforme estoque",
          notes: "Loja oficial com nota fiscal.",
          purchaseUrl:
            "https://www.mercadolivre.com.br/arandela-solar-integrada-intelbras-asi-500-dual-color/p/MLB21407279",
          purchaseStore: "Mercado Livre",
          purchaseVerified: true,
          purchaseSource: "manual",
        },
      ],
      items: [
        {
          id: "itm_1_0005",
          description:
            "Arandela Solar Integrada ASI 500 Intelbras (Mesmo modelo, vendedores distintos)",
          unit: "un",
          quantity: 2,
          prices: {
            sup_a_0005: 304.18,
            sup_b_0005: 457.05,
            sup_c_0005: 419.9,
          },
          costType: "material",
          purchaseUrl:
            "https://www.leroymerlin.com.br/arandela-solar-externa-ip65-led-intelbras-branco_92036770",
          purchaseStore: "Leroy Merlin",
          purchasePrice: 242.9,
          purchaseVerified: true,
          purchaseSource: "documento",
        },
      ],
      attachments: [],
      notes:
        "A referência na Leroy Merlin apresenta valor unitário competitivo (R$ 242,90) para verificação de estoque local antes do fechamento.",
    }),

    buildSeedMap("MC-2026-0006", {
      status: "em_analise",
      condominium:
        "Associação dos Adquirentes de Lotes no Loteamento Vale Industrial Paulista",
      analysisDate: "2026-11-09",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "Manutenção Mensal de Segurança Eletrônica",
      description:
        "Contrato anual de manutenção preventiva e corretiva do sistema de CFTV, cercas elétricas, controle de acesso e alarme perimetral da associação.",
      kind: "servico",
      category: "Segurança e portaria",
      suppliers: [
        {
          id: "sup_a_0006",
          name: "Cipriano Tech & Security",
          contact: "comercial@ciprianotech.com.br",
          deliveryDays: "Atendimento em até 4h",
          paymentTerms: "Mensal · boleto 15 dias",
          validity: "30 dias",
          notes: "Inclui 2 visitas preventivas mensais e suporte 24h.",
        },
        {
          id: "sup_b_0006",
          name: "Vigilare Sistemas",
          contact: "(12) 3951-4420",
          deliveryDays: "Atendimento em até 8h",
          paymentTerms: "Mensal · boleto 10 dias",
          validity: "15 dias",
          notes: "Peças de reposição faturadas à parte mediante aprovação.",
        },
        {
          id: "sup_c_0006",
          name: "Alpha Proteção Eletrônica",
          contact: "orcamentos@alphaprotecao.com.br",
          deliveryDays: "Atendimento em até 6h",
          paymentTerms: "Mensal · 28 dias",
          validity: "30 dias",
          notes: "Contrato com fidelidade de 12 meses.",
        },
      ],
      items: [
        {
          id: "itm_1_0006",
          description:
            "Manutenção preventiva e corretiva mensal de CFTV e controle de acesso (12 meses)",
          unit: "mês",
          quantity: 12,
          prices: {
            sup_a_0006: 2200,
            sup_b_0006: 2750,
            sup_c_0006: 2500,
          },
          costType: "mao_obra",
        },
        {
          id: "itm_2_0006",
          description:
            "Kit inicial de revisão de conectores, fontes e sensores perimetrais",
          unit: "vb (verba)",
          quantity: 1,
          prices: {
            sup_a_0006: 3850,
            sup_b_0006: 5650,
            sup_c_0006: 4900,
          },
          costType: "material",
        },
      ],
      attachments: [
        {
          name: "Proposta_Cipriano_Tech.pdf",
          size: 312400,
          type: "application/pdf",
          source: "ia",
          analyzedAt: "2026-11-09T14:20:00.000Z",
        },
      ],
      notes:
        "Validar SLA de atendimento emergencial em finais de semana antes da assinatura do contrato.",
    }),

    buildSeedMap("MC-2026-0011", {
      status: "em_analise",
      condominium: "RESIDENCIAL PARAISO DO SUL",
      analysisDate: "2026-11-19",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "Cotação MP Engenharia — Materiais Elétricos e Hidráulicos",
      description:
        "Levantamento de materiais elétricos, hidráulicos e acabamento conforme planilha técnica da MP Engenharia para revitalização das áreas comuns.",
      kind: "produtos",
      category: "Obras e reformas",
      suppliers: [
        {
          id: "sup_a_0011",
          name: "AMEX",
          contact: "vendas@amexmateriais.com.br",
          deliveryDays: "5 dias úteis",
          paymentTerms: "30/60 dias boleto",
          validity: "15 dias",
          notes: "Entrega fracionada conforme cronograma da obra.",
        },
        {
          id: "sup_b_0011",
          name: "Constrular Atacado",
          contact: "(12) 3922-8810",
          deliveryDays: "7 dias úteis",
          paymentTerms: "28 dias boleto",
          validity: "10 dias",
          notes: "Frete incluso para pedidos acima de R$ 15.000.",
        },
        {
          id: "sup_c_0011",
          name: "Obra Forte Distribuidora",
          contact: "comercial@obraforte.com.br",
          deliveryDays: "10 dias úteis",
          paymentTerms: "À vista com 3% ou 30 dias",
          validity: "15 dias",
          notes: "Materiais certificados conforme ABNT.",
        },
      ],
      items: [
        {
          id: "itm_1_0011",
          description:
            "Lote de cabeamento flexível antichama 2,5mm a 10mm, disjuntores DIN e quadros de distribuição",
          unit: "vb (verba)",
          quantity: 1,
          prices: {
            sup_a_0011: 14250.45,
            sup_b_0011: 19840.12,
            sup_c_0011: 17110.0,
          },
          costType: "material",
        },
        {
          id: "itm_2_0011",
          description:
            "Tubulações PVC soldável/esgoto, registros de gaveta e conexões hidráulicas prediais",
          unit: "vb (verba)",
          quantity: 1,
          prices: {
            sup_a_0011: 9480.64,
            sup_b_0011: 13620.0,
            sup_c_0011: 11450.5,
          },
          costType: "material",
        },
        {
          id: "itm_3_0011",
          description:
            "Luminárias LED herméticas, refletores externos e sensores de presença de garagem",
          unit: "vb (verba)",
          quantity: 1,
          prices: {
            sup_a_0011: 7154.0,
            sup_b_0011: 9621.0,
            sup_c_0011: 8490.0,
          },
          costType: "material",
        },
      ],
      attachments: [
        {
          name: "Cotacao_AMEX_MP_Engenharia.pdf",
          size: 482000,
          type: "application/pdf",
          source: "ia",
          analyzedAt: "2026-11-19T18:10:00.000Z",
        },
      ],
    }),

    buildSeedMap("MC-2026-0010", {
      status: "em_analise",
      condominium: "Edifício Alta Vista",
      analysisDate: "2026-11-16",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "Controle de Pragas",
      description:
        "Dedetização, desratização e controle preventivo de pragas urbanas nas áreas comuns, garagens, casa de lixo e caixas de gordura.",
      kind: "servico",
      category: "Limpeza e conservação",
      suppliers: [
        {
          id: "sup_a_0010",
          name: "D.D.DRIN",
          contact: "(12) 3941-2020",
          deliveryDays: "Agendamento em 48h",
          paymentTerms: "Boleto 15 dias",
          validity: "30 dias",
          notes: "Certificado de garantia de 6 meses com laudo técnico ANVISA.",
        },
        {
          id: "sup_b_0010",
          name: "BioControl Ambiental",
          contact: "contato@biocontrol.com.br",
          deliveryDays: "Agendamento em 3 dias",
          paymentTerms: "À vista ou 2x",
          validity: "20 dias",
          notes: "Inclui reforço em 30 dias se necessário.",
        },
        {
          id: "sup_c_0010",
          name: "Sanitec Dedetizadora",
          contact: "(12) 3911-7700",
          deliveryDays: "Agendamento em 5 dias",
          paymentTerms: "Boleto 28 dias",
          validity: "30 dias",
          notes: "Atendimento em horário comercial.",
        },
      ],
      items: [
        {
          id: "itm_1_0010",
          description:
            "Serviço completo de desinsetização e desratização das áreas comuns com certificado sanitário",
          unit: "serviço",
          quantity: 1,
          prices: {
            sup_a_0010: 838.0,
            sup_b_0010: 1450.0,
            sup_c_0010: 2800.0,
          },
          costType: "nao_discriminado",
        },
      ],
      attachments: [],
    }),

    buildSeedMap("MC-2026-0008", {
      status: "em_analise",
      condominium: "Associação dos Proprietários do Village Paraibuna",
      analysisDate: "2026-11-13",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "Compra de Nobreak",
      description:
        "Aquisição de nobreak 1200VA bivolt para proteção dos equipamentos da portaria e servidor de câmeras.",
      kind: "produtos",
      category: "Segurança e portaria",
      suppliers: [
        {
          id: "sup_a_0008",
          name: "Loja oficial Info Store (Opção 2)",
          contact: "E-commerce",
          deliveryDays: "4 dias úteis",
          paymentTerms: "PIX ou 6x sem juros",
          validity: "Conforme estoque",
          notes: "Garantia de 12 meses Intelbras.",
        },
        {
          id: "sup_b_0008",
          name: "KaBuM!",
          contact: "E-commerce",
          deliveryDays: "5 dias úteis",
          paymentTerms: "PIX à vista",
          validity: "Conforme estoque",
          notes: "Frete incluso na cotação.",
          purchaseUrl: "https://www.kabum.com.br",
          purchaseStore: "KaBuM!",
          purchaseVerified: true,
          purchaseSource: "manual",
        },
        {
          id: "sup_c_0008",
          name: "Kalunga",
          contact: "Site / Loja Física",
          deliveryDays: "Retirada imediata",
          paymentTerms: "Boleto ou cartão",
          validity: "7 dias",
          notes: "Disponível para retirada em loja.",
          purchaseUrl: "https://www.kalunga.com.br",
          purchaseStore: "Kalunga",
          purchaseVerified: true,
          purchaseSource: "manual",
        },
      ],
      items: [
        {
          id: "itm_1_0008",
          description: "Nobreak Intelbras XNB 1200VA Bivolt 6 Tomadas",
          unit: "un",
          quantity: 1,
          prices: {
            sup_a_0008: 479.0,
            sup_b_0008: 512.5,
            sup_c_0008: 522.92,
          },
          costType: "material",
        },
      ],
      attachments: [],
    }),

    buildSeedMap("MC-2026-0007", {
      status: "em_analise",
      condominium: "Associação dos Proprietários do Village Paraibuna",
      analysisDate: "2026-11-12",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "SSD NVME para PC da Portaria",
      description:
        "Substituição do disco rígido do computador da portaria por SSD NVMe 500GB para ganho de desempenho no sistema de controle de acesso.",
      kind: "produtos",
      category: "Administrativo",
      suppliers: [
        {
          id: "sup_a_0007",
          name: "Onlitec",
          contact: "vendas@onlitec.com.br",
          deliveryDays: "2 dias úteis",
          paymentTerms: "PIX ou boleto 7 dias",
          validity: "10 dias",
          notes: "Garantia de 3 anos pelo fabricante.",
        },
        {
          id: "sup_b_0007",
          name: "KaBuM!",
          contact: "E-commerce",
          deliveryDays: "4 dias úteis",
          paymentTerms: "PIX",
          validity: "Conforme estoque",
          notes: "",
        },
        {
          id: "sup_c_0007",
          name: "Amazon Brasil",
          contact: "E-commerce",
          deliveryDays: "3 dias úteis",
          paymentTerms: "Cartão ou PIX",
          validity: "Conforme estoque",
          notes: "Entrega Prime.",
        },
      ],
      items: [
        {
          id: "itm_1_0007",
          description: "SSD Kingston NV2 500GB M.2 2280 NVMe PCIe 4.0",
          unit: "un",
          quantity: 1,
          prices: {
            sup_a_0007: 350.0,
            sup_b_0007: 389.9,
            sup_c_0007: 404.99,
          },
          costType: "material",
        },
      ],
      attachments: [],
    }),

    buildSeedMap("MC-2026-0004", {
      status: "em_analise",
      condominium: "Edifício Alta Vista",
      analysisDate: "2026-11-09",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "Leitura dos medidores de água",
      description:
        "Serviço mensal de leitura individualizada de hidrômetros com emissão de relatório fotográfico e planilha de rateio.",
      kind: "servico",
      category: "Hidráulica",
      suppliers: [
        {
          id: "sup_a_0004",
          name: "ACQUA TECH",
          contact: "comercial@acquatech.com.br",
          deliveryDays: "Leitura todo dia 25",
          paymentTerms: "Mensal · boleto 10 dias",
          validity: "30 dias",
          notes: "Relatório integrado para a administradora.",
        },
        {
          id: "sup_b_0004",
          name: "HidroMed Gestão",
          contact: "(12) 3921-5530",
          deliveryDays: "Leitura mensal agendada",
          paymentTerms: "Mensal · boleto 15 dias",
          validity: "30 dias",
          notes: "",
        },
        {
          id: "sup_c_0004",
          name: "MedeFácil Individualização",
          contact: "contato@medefacil.com.br",
          deliveryDays: "Leitura mensal",
          paymentTerms: "Mensal · boleto 10 dias",
          validity: "15 dias",
          notes: "",
        },
      ],
      items: [
        {
          id: "itm_1_0004",
          description:
            "Leitura individualizada mensal dos medidores de água com relatório de rateio",
          unit: "mês",
          quantity: 1,
          prices: {
            sup_a_0004: 84.0,
            sup_b_0004: 105.0,
            sup_c_0004: 120.0,
          },
          costType: "mao_obra",
        },
      ],
      attachments: [],
    }),

    buildSeedMap("MC-2026-0003", {
      status: "em_analise",
      condominium: "Matiss Vila Ema",
      analysisDate: "2026-11-06",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "Aquisição de Cafeteira Elétrica",
      description:
        "Aquisição de cafeteira elétrica de jarra inox para copa da administração e reuniões do conselho.",
      kind: "produtos",
      category: "Administrativo",
      suppliers: [
        {
          id: "sup_a_0003",
          name: "Electrolux Loja Oficial",
          contact: "E-commerce",
          deliveryDays: "3 dias úteis",
          paymentTerms: "PIX ou 3x sem juros",
          validity: "Conforme estoque",
          notes: "Nota fiscal em nome do condomínio.",
        },
        {
          id: "sup_b_0003",
          name: "Magazine Luiza",
          contact: "E-commerce",
          deliveryDays: "4 dias úteis",
          paymentTerms: "PIX",
          validity: "Conforme estoque",
          notes: "",
        },
        {
          id: "sup_c_0003",
          name: "Amazon Brasil",
          contact: "E-commerce",
          deliveryDays: "2 dias úteis",
          paymentTerms: "Cartão ou PIX",
          validity: "Conforme estoque",
          notes: "",
        },
      ],
      items: [
        {
          id: "itm_1_0003",
          description: "Cafeteira Elétrica Electrolux Efficient ECM10 15 xícaras",
          unit: "un",
          quantity: 1,
          prices: {
            sup_a_0003: 111.5,
            sup_b_0003: 119.9,
            sup_c_0003: 123.81,
          },
          costType: "material",
        },
      ],
      attachments: [],
    }),

    buildSeedMap("MC-2026-0002", {
      status: "em_analise",
      condominium:
        "Apesi - Associação dos Proprietários do Entreserras Santa Isabel",
      analysisDate: "2026-10-27",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "Fornecimento de Armário Inteligente para Encomendas",
      description:
        "Aquisição e instalação de armário inteligente (smart locker) com 16 compartimentos para recebimento autônomo de entregas na portaria.",
      kind: "produtos",
      category: "Segurança e portaria",
      suppliers: [
        {
          id: "sup_a_0002",
          name: "Biccateca (Armários Inteligentes)",
          contact: "comercial@biccateca.com.br",
          deliveryDays: "25 dias corridos",
          paymentTerms: "50% pedido + 50% entrega",
          validity: "30 dias",
          notes: "Instalação e treinamento inclusos. Garantia 12 meses.",
        },
        {
          id: "sup_b_0002",
          name: "SmartBox Lockers",
          contact: "vendas@smartboxlockers.com.br",
          deliveryDays: "30 dias corridos",
          paymentTerms: "40% entrada + 2x boleto",
          validity: "20 dias",
          notes: "Software de notificação via WhatsApp incluso.",
        },
      ],
      items: [
        {
          id: "itm_1_0002",
          description:
            "Armário inteligente modular 16 portas com tela touch e integração de notificações",
          unit: "un",
          quantity: 1,
          prices: {
            sup_a_0002: 13443.6,
            sup_b_0002: 14603.0,
          },
          costType: "material",
        },
      ],
      attachments: [],
    }),

    buildSeedMap("MC-2026-0001", {
      status: "em_analise",
      condominium:
        "Associação dos Adquirentes de Lotes no Loteamento Vale Industrial Paulista",
      analysisDate: "2026-10-27",
      recipient: "Síndico(a) e Conselho Consultivo",
      service: "Reforma da portaria e pintura de sinalização",
      description:
        "Reforma estrutural da guarita principal, impermeabilização da laje e pintura viária de sinalização horizontal das pistas de entrada e saída.",
      kind: "servico",
      category: "Obras e reformas",
      suppliers: [
        {
          id: "sup_a_0001",
          name: "Ancore Engenharia",
          contact: "engenharia@ancore.com.br",
          deliveryDays: "30 dias corridos",
          paymentTerms: "Medição quinzenal",
          validity: "30 dias",
          notes: "Inclui ART de execução e limpeza final da obra.",
        },
        {
          id: "sup_b_0001",
          name: "Construtora Vale Norte",
          contact: "(12) 3953-1122",
          deliveryDays: "35 dias corridos",
          paymentTerms: "30% entrada + medições",
          validity: "20 dias",
          notes: "Cotação apenas da reforma da guarita (sinalização não cotada).",
        },
        {
          id: "sup_c_0001",
          name: "Sinaliza & Obras Ltda",
          contact: "comercial@sinalizaobras.com.br",
          deliveryDays: "25 dias corridos",
          paymentTerms: "Boleto 15/30/45 dias",
          validity: "15 dias",
          notes: "Cotação apenas da pintura viária.",
        },
      ],
      items: [
        {
          id: "itm_1_0001",
          description:
            "Reforma geral da guarita, revestimento e impermeabilização da cobertura",
          unit: "serviço",
          quantity: 1,
          prices: {
            sup_a_0001: 22500.0,
            sup_b_0001: 24800.0,
            sup_c_0001: null,
          },
          costType: "nao_discriminado",
        },
        {
          id: "itm_2_0001",
          description:
            "Pintura de sinalização horizontal viária em tinta acrílica refletiva",
          unit: "serviço",
          quantity: 1,
          prices: {
            sup_a_0001: 6800.0,
            sup_b_0001: null,
            sup_c_0001: 7450.0,
          },
          costType: "nao_discriminado",
        },
      ],
      attachments: [],
    }),
  ];

  const inserted = [];
  for (const item of seedMaps) {
    const [row] = await db
      .insert(quotations)
      .values({
        protocol: item.protocol,
        status: item.data.status,
        condominium: item.data.condominium,
        analysisDate: item.data.analysisDate,
        recipient: item.data.recipient,
        service: item.data.service,
        description: item.data.description,
        kind: item.data.kind,
        category: item.data.category,
        suppliers: item.data.suppliers,
        items: item.data.items,
        analysis: item.data.analysis,
        attachments: item.data.attachments,
      })
      .returning({
        id: quotations.id,
        protocol: quotations.protocol,
        condominium: quotations.condominium,
        analysisDate: quotations.analysisDate,
      });
    inserted.push(row);
  }

  // Seed initial PDF download history entries matching the dashboard
  for (const row of inserted.slice(0, 5)) {
    const slug = row.condominium
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 56);
    await db.insert(pdfDownloads).values({
      fileName: `Mapa-de-Cotacao_${row.protocol}_${slug}_${row.analysisDate}.pdf`,
      kind: "mapa",
      quotationId: row.id,
      condominium: row.condominium,
      sizeBytes: 40960,
    });
  }
}
