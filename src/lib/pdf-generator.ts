import { GERENCIAL_LOGO_DATA_URI } from "./brand-assets";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  computeSummary,
  formatCurrency,
  formatDateBR,
  itemTotal,
  lowestPriceForItem,
  recordedSavings,
  supplierCostBreakdown,
} from "./calculations";
import { COST_TYPE_LABEL, type CostType, type QuotationRecord } from "./types";

const INK = rgb(24 / 255, 20 / 255, 71 / 255);
const INK_DEEP = rgb(16 / 255, 14 / 255, 48 / 255);
const BRAND = rgb(250 / 255, 177 / 255, 42 / 255);
const BRAND_DARK = rgb(138 / 255, 92 / 255, 0);
const SUCCESS = rgb(14 / 255, 72 / 255, 40 / 255);
const SUCCESS_SOFT = rgb(231 / 255, 240 / 255, 233 / 255);
const PAPER = rgb(246 / 255, 244 / 255, 238 / 255);
const PAPER_ALT = rgb(251 / 255, 249 / 255, 242 / 255);
const TOTAL_ROW = rgb(241 / 255, 238 / 255, 226 / 255);
const LINE = rgb(227 / 255, 224 / 255, 211 / 255);
const SLATE = rgb(100 / 255, 110 / 255, 130 / 255);
const TEXT_DARK = rgb(35 / 255, 35 / 255, 58 / 255);
const WHITE = rgb(1, 1, 1);

function cleanPdfText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/\u00a0/g, " ")
    .replace(/\u2013|\u2014|\u2212/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00b7/g, " - ")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const safe = cleanPdfText(text);
  if (!safe) return [];
  const paragraphs = safe.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

/** Reduz a fonte até caber na largura; se ainda não couber, trunca com reticências. */
function fitText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  minSize = 5.2
): { text: string; size: number } {
  const safe = cleanPdfText(text);
  let currentSize = size;
  while (
    currentSize > minSize &&
    font.widthOfTextAtSize(safe, currentSize) > maxWidth
  ) {
    currentSize -= 0.4;
  }
  if (font.widthOfTextAtSize(safe, currentSize) <= maxWidth) {
    return { text: safe, size: currentSize };
  }
  let cut = safe;
  while (
    cut.length > 1 &&
    font.widthOfTextAtSize(`${cut}...`, minSize) > maxWidth
  ) {
    cut = cut.slice(0, -1);
  }
  return { text: `${cut.trimEnd()}...`, size: minSize };
}

function truncateText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string {
  return fitText(text, font, size, maxWidth, size).text;
}

async function embedLogo(pdfDoc: PDFDocument) {
  return pdfDoc.embedPng(GERENCIAL_LOGO_DATA_URI);
}

const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const MARGIN_X = 34;
const BOTTOM_LIMIT = 56;

class PdfBuilder {
  page: PDFPage;
  readonly pages: PDFPage[] = [];
  y = PAGE_H;
  readonly contentWidth = PAGE_W - MARGIN_X * 2;

  constructor(private pdfDoc: PDFDocument) {
    this.page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
  }

  get marginX() {
    return MARGIN_X;
  }

  get pageW() {
    return PAGE_W;
  }

  ensureSpace(needed: number) {
    if (this.y - needed < BOTTOM_LIMIT) {
      this.page = this.pdfDoc.addPage([PAGE_W, PAGE_H]);
      this.pages.push(this.page);
      this.y = PAGE_H - 36;
    }
  }

  drawFooterAll(fontRegular: PDFFont, text: string) {
    this.pages.forEach((page, idx) => {
      page.drawLine({
        start: { x: MARGIN_X, y: 38 },
        end: { x: PAGE_W - MARGIN_X, y: 38 },
        thickness: 0.6,
        color: LINE,
      });
      page.drawText(cleanPdfText(text), {
        x: MARGIN_X,
        y: 27,
        size: 6.8,
        font: fontRegular,
        color: SLATE,
      });
      const pageLabel = `Pagina ${idx + 1}/${this.pages.length}`;
      page.drawText(pageLabel, {
        x: PAGE_W - MARGIN_X - fontRegular.widthOfTextAtSize(pageLabel, 6.8),
        y: 27,
        size: 6.8,
        font: fontRegular,
        color: SLATE,
      });
    });
  }
}

export async function generateQuotationPdf(
  quotation: QuotationRecord
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await embedLogo(pdfDoc);

  const doc = new PdfBuilder(pdfDoc);
  const { page } = doc;
  const contentWidth = doc.contentWidth;
  const bandHeight = 82;

  // ---- Header band -------------------------------------------------------
  page.drawRectangle({
    x: 0,
    y: PAGE_H - bandHeight,
    width: PAGE_W,
    height: bandHeight,
    color: INK,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_H - bandHeight - 4,
    width: PAGE_W,
    height: 4,
    color: BRAND,
  });

  if (logoImage) {
    const dims = logoImage.scaleToFit(140, 26);
    page.drawImage(logoImage, {
      x: MARGIN_X,
      y: PAGE_H - 40,
      width: dims.width,
      height: dims.height,
    });
  } else {
    page.drawText("GERENCIAL", {
      x: MARGIN_X,
      y: PAGE_H - 38,
      size: 16,
      font: fontBold,
      color: WHITE,
    });
  }

  page.drawText(
    cleanPdfText("Administracao, governanca e apoio a decisao em condominios."),
    {
      x: MARGIN_X,
      y: PAGE_H - 58,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.76, 0.78, 0.86),
    }
  );

  const docTag = "DOCUMENTO DE GOVERNANCA";
  const docTitle = "Mapa de Cotacao";
  const protoLabel = `PROTOCOLO ${cleanPdfText(quotation.protocol)}`;

  page.drawText(docTag, {
    x: PAGE_W - MARGIN_X - fontBold.widthOfTextAtSize(docTag, 7),
    y: PAGE_H - 24,
    size: 7,
    font: fontBold,
    color: BRAND,
  });
  page.drawText(docTitle, {
    x: PAGE_W - MARGIN_X - fontBold.widthOfTextAtSize(docTitle, 18),
    y: PAGE_H - 44,
    size: 18,
    font: fontBold,
    color: WHITE,
  });
  const protoWidth = fontBold.widthOfTextAtSize(protoLabel, 7.5) + 14;
  page.drawRectangle({
    x: PAGE_W - MARGIN_X - protoWidth,
    y: PAGE_H - 68,
    width: protoWidth,
    height: 15,
    color: BRAND,
  });
  page.drawText(protoLabel, {
    x: PAGE_W - MARGIN_X - protoWidth + 7,
    y: PAGE_H - 63,
    size: 7.5,
    font: fontBold,
    color: INK_DEEP,
  });

  doc.y = PAGE_H - bandHeight - 20;

  // ---- Identification box -------------------------------------------------
  const descLines = wrapText(
    quotation.description || "Sem descricao detalhada informada.",
    fontRegular,
    8.5,
    contentWidth - 20
  ).slice(0, 6);
  const metaBoxHeight = 76 + descLines.length * 11;
  page.drawRectangle({
    x: MARGIN_X,
    y: doc.y - metaBoxHeight,
    width: contentWidth,
    height: metaBoxHeight,
    color: PAPER,
  });
  page.drawRectangle({
    x: MARGIN_X,
    y: doc.y - metaBoxHeight,
    width: 3,
    height: metaBoxHeight,
    color: INK,
  });

  const drawMetaField = (
    label: string,
    value: string,
    x: number,
    fy: number,
    maxW: number,
    font: PDFFont = fontBold,
    size = 9.5
  ) => {
    page.drawText(cleanPdfText(label).toUpperCase(), {
      x,
      y: fy,
      size: 6.5,
      font: fontBold,
      color: SLATE,
    });
    const fitted = fitText(value || "-", font, size, maxW);
    page.drawText(fitted.text, {
      x,
      y: fy - 12,
      size: fitted.size,
      font,
      color: INK,
    });
  };

  drawMetaField(
    "Condominio / Associacao",
    quotation.condominium,
    MARGIN_X + 10,
    doc.y - 14,
    290
  );
  drawMetaField(
    "Data analise",
    formatDateBR(quotation.analysisDate),
    MARGIN_X + 315,
    doc.y - 14,
    95
  );
  drawMetaField(
    "Natureza",
    `${quotation.kind === "produtos" ? "Produtos" : "Servico"} - ${
      quotation.category
    }`,
    MARGIN_X + 415,
    doc.y - 14,
    105,
    fontBold,
    8
  );

  drawMetaField("A/C", quotation.recipient, MARGIN_X + 10, doc.y - 42, 210, fontBold, 9);
  drawMetaField("Servico / Objeto", quotation.service, MARGIN_X + 230, doc.y - 42, 285, fontBold, 9);

  page.drawLine({
    start: { x: MARGIN_X + 10, y: doc.y - 62 },
    end: { x: PAGE_W - MARGIN_X - 10, y: doc.y - 62 },
    thickness: 0.6,
    color: LINE,
  });

  page.drawText("DESCRICAO", {
    x: MARGIN_X + 10,
    y: doc.y - 72,
    size: 6.5,
    font: fontBold,
    color: SLATE,
  });
  let dy = doc.y - 83;
  for (const line of descLines) {
    page.drawText(line, {
      x: MARGIN_X + 10,
      y: dy,
      size: 8.5,
      font: fontRegular,
      color: TEXT_DARK,
    });
    dy -= 11;
  }

  doc.y = doc.y - metaBoxHeight - 16;

  const drawSectionTitle = (title: string, rightNote?: string) => {
    doc.ensureSpace(34);
    doc.page.drawText(cleanPdfText(title).toUpperCase(), {
      x: MARGIN_X,
      y: doc.y,
      size: 8.5,
      font: fontBold,
      color: INK,
    });
    if (rightNote) {
      const note = cleanPdfText(rightNote).toUpperCase();
      doc.page.drawText(note, {
        x: PAGE_W - MARGIN_X - fontBold.widthOfTextAtSize(note, 7),
        y: doc.y + 1,
        size: 7,
        font: fontBold,
        color: SLATE,
      });
    }
    doc.page.drawLine({
      start: { x: MARGIN_X, y: doc.y - 5 },
      end: { x: PAGE_W - MARGIN_X, y: doc.y - 5 },
      thickness: 0.8,
      color: LINE,
    });
    doc.y -= 16;
  };

  const summary = computeSummary(quotation);
  const suppliers = quotation.suppliers.slice(0, 5);
  const items = quotation.items.length > 0 ? quotation.items : [];

  // ---- Section 1: comparative table --------------------------------------
  drawSectionTitle(
    "1 - Mapa comparativo de propostas",
    "Menor preco destacado - valores em R$"
  );

  const numColW = 18;
  const qtyColW = 26;
  const unitColW = 32;
  const supplierCount = Math.max(1, suppliers.length);
  const fixedW = numColW + qtyColW + unitColW;
  // Distribuição: fornecedores com o máximo possível, descrição com mínimo legível
  const supColW = Math.max(
    62,
    Math.min(108, Math.floor((contentWidth - fixedW - 140) / supplierCount))
  );
  const descColW = contentWidth - fixedW - supColW * supplierCount;

  const headerH = 20;
  doc.ensureSpace(headerH + 20);
  doc.page.drawRectangle({
    x: MARGIN_X,
    y: doc.y - headerH + 6,
    width: contentWidth,
    height: headerH,
    color: INK,
  });

  let cx = MARGIN_X + 4;
  doc.page.drawText("#", { x: cx, y: doc.y - 7, size: 7.5, font: fontBold, color: WHITE });
  cx += numColW;
  doc.page.drawText("ITEM / ESCOPO", {
    x: cx,
    y: doc.y - 7,
    size: 7.5,
    font: fontBold,
    color: WHITE,
  });
  cx += descColW;
  doc.page.drawText("QTD", { x: cx, y: doc.y - 7, size: 7.5, font: fontBold, color: WHITE });
  cx += qtyColW;
  doc.page.drawText("UN.", { x: cx, y: doc.y - 7, size: 7.5, font: fontBold, color: WHITE });
  cx += unitColW;
  for (const sup of suppliers) {
    const fitted = fitText(sup.name || "Fornecedor", fontBold, 7, supColW - 8);
    doc.page.drawText(fitted.text, {
      x: cx + supColW - 4 - fontBold.widthOfTextAtSize(fitted.text, fitted.size),
      y: doc.y - 7,
      size: fitted.size,
      font: fontBold,
      color: WHITE,
    });
    cx += supColW;
  }
  doc.y -= headerH;

  // Table body — descrições quebram em até 3 linhas e a linha cresce conforme necessário
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const descWrapped = wrapText(
      item.description || "Item sem descricao",
      fontRegular,
      7.6,
      descColW - 8
    ).slice(0, 4);
    const rowH = Math.max(23, descWrapped.length * 9.6 + 13);
    doc.ensureSpace(rowH + 6);
    const pageRow = doc.page;

    if (idx % 2 === 1) {
      pageRow.drawRectangle({
        x: MARGIN_X,
        y: doc.y - rowH + 6,
        width: contentWidth,
        height: rowH,
        color: PAPER_ALT,
      });
    }

    const lowest = lowestPriceForItem(item, suppliers);
    let rx = MARGIN_X + 4;
    pageRow.drawText(String(idx + 1).padStart(2, "0"), {
      x: rx,
      y: doc.y - 6,
      size: 7.5,
      font: fontRegular,
      color: SLATE,
    });
    rx += numColW;

    let ty = doc.y - 6;
    for (const line of descWrapped) {
      pageRow.drawText(line, {
        x: rx,
        y: ty,
        size: 7.6,
        font: fontRegular,
        color: TEXT_DARK,
      });
      ty -= 9.6;
    }
    pageRow.drawText(
      cleanPdfText(COST_TYPE_LABEL[item.costType ?? "nao_discriminado"]).toUpperCase(),
      {
        x: rx,
        y: ty,
        size: 6,
        font: fontBold,
        color: SLATE,
      }
    );

    rx += descColW;
    pageRow.drawText(String(item.quantity ?? "-"), {
      x: rx + 2,
      y: doc.y - 6,
      size: 7.6,
      font: fontRegular,
      color: TEXT_DARK,
    });
    rx += qtyColW;
    pageRow.drawText(truncateText(item.unit || "un", fontRegular, 7, unitColW - 4), {
      x: rx,
      y: doc.y - 6,
      size: 7,
      font: fontRegular,
      color: SLATE,
    });
    rx += unitColW;

    for (const sup of suppliers) {
      const price = item.prices?.[sup.id] ?? null;
      const isLowest =
        price !== null && lowest !== null && Math.abs(price - lowest) < 0.005;
      if (isLowest) {
        pageRow.drawRectangle({
          x: rx,
          y: doc.y - rowH + 6,
          width: supColW,
          height: rowH,
          color: SUCCESS_SOFT,
        });
      }
      const txt = cleanPdfText(formatCurrency(price));
      const fitted = fitText(txt, isLowest ? fontBold : fontRegular, 7.6, supColW - 6);
      pageRow.drawText(fitted.text, {
        x: rx + supColW - 4 - (isLowest ? fontBold : fontRegular).widthOfTextAtSize(
          fitted.text,
          fitted.size
        ),
        y: doc.y - 6,
        size: fitted.size,
        font: isLowest ? fontBold : fontRegular,
        color: isLowest ? SUCCESS : TEXT_DARK,
      });
      rx += supColW;
    }

    pageRow.drawLine({
      start: { x: MARGIN_X, y: doc.y - rowH + 6 },
      end: { x: PAGE_W - MARGIN_X, y: doc.y - rowH + 6 },
      thickness: 0.4,
      color: LINE,
    });
    doc.y -= rowH;
  }

  // Total row
  doc.ensureSpace(52);
  {
    const totalH = 20;
    const leftSpanW = fixedW + descColW;
    doc.page.drawRectangle({
      x: MARGIN_X,
      y: doc.y - totalH + 6,
      width: leftSpanW,
      height: totalH,
      color: INK,
    });
    const totLabel = "TOTAL GERAL DA PROPOSTA";
    doc.page.drawText(totLabel, {
      x: MARGIN_X + leftSpanW - 8 - fontBold.widthOfTextAtSize(totLabel, 7.2),
      y: doc.y - 7,
      size: 7.2,
      font: fontBold,
      color: WHITE,
    });

    let tx = MARGIN_X + leftSpanW;
    for (const sup of suppliers) {
      let sum = 0;
      let count = 0;
      for (const it of items) {
        const t = itemTotal(it, sup.id);
        if (t !== null) {
          sum += t;
          count += 1;
        }
      }
      const tot = count > 0 ? Math.round(sum * 100) / 100 : null;
      const isBest = summary.best?.supplier.id === sup.id;
      doc.page.drawRectangle({
        x: tx,
        y: doc.y - totalH + 6,
        width: supColW,
        height: totalH,
        color: isBest ? SUCCESS_SOFT : TOTAL_ROW,
      });
      const txt = cleanPdfText(formatCurrency(tot));
      const fitted = fitText(txt, fontBold, 8, supColW - 6);
      doc.page.drawText(fitted.text, {
        x: tx + supColW - 4 - fontBold.widthOfTextAtSize(fitted.text, fitted.size),
        y: doc.y - 7,
        size: fitted.size,
        font: fontBold,
        color: isBest ? SUCCESS : INK,
      });
      tx += supColW;
    }
    doc.y -= totalH;
  }

  // Cost-type breakdown rows
  const costTypes: CostType[] = ["mao_obra", "material", "nao_discriminado"];
  for (const ct of costTypes) {
    const bh = 15;
    const leftSpanW = fixedW + descColW;
    const lbl = cleanPdfText(COST_TYPE_LABEL[ct]).toUpperCase();
    const fittedLabel = fitText(lbl, fontBold, 7.2, leftSpanW - 10);
    doc.page.drawText(fittedLabel.text, {
      x: MARGIN_X + leftSpanW - 8 - fontBold.widthOfTextAtSize(
        fittedLabel.text,
        fittedLabel.size
      ),
      y: doc.y - 5,
      size: fittedLabel.size,
      font: fontBold,
      color: SLATE,
    });
    let bx = MARGIN_X + leftSpanW;
    for (const sup of suppliers) {
      const val = supplierCostBreakdown(items, sup.id)[ct].total;
      const txt = cleanPdfText(formatCurrency(val));
      const fitted = fitText(txt, fontRegular, 7.2, supColW - 6);
      doc.page.drawText(fitted.text, {
        x: bx + supColW - 4 - fontRegular.widthOfTextAtSize(fitted.text, fitted.size),
        y: doc.y - 5,
        size: fitted.size,
        font: fontRegular,
        color: SLATE,
      });
      bx += supColW;
    }
    doc.page.drawLine({
      start: { x: MARGIN_X, y: doc.y - bh + 6 },
      end: { x: PAGE_W - MARGIN_X, y: doc.y - bh + 6 },
      thickness: 0.35,
      color: LINE,
    });
    doc.y -= bh;
  }

  doc.y -= 12;

  // ---- Section 2: commercial conditions -----------------------------------
  drawSectionTitle(
    "2 - Condicoes comerciais e cobertura",
    `${summary.supplierCount} fornecedor(es) consultado(s)`
  );

  const contactColW = Math.max(
    56,
    contentWidth - (122 + 66 + 36 + 78 + 88 + 58)
  );
  const condCols = [
    { label: "FORNECEDOR", w: 122 },
    { label: "PROPOSTA", w: 66 },
    { label: "COB.", w: 36 },
    { label: "ENTREGA", w: 78 },
    { label: "PAGAMENTO", w: 88 },
    { label: "VALIDADE", w: 58 },
    { label: "CONTATO", w: contactColW },
  ];

  doc.ensureSpace(24);
  doc.page.drawRectangle({
    x: MARGIN_X,
    y: doc.y - 18 + 6,
    width: contentWidth,
    height: 18,
    color: INK,
  });
  let ccx = MARGIN_X + 4;
  for (const col of condCols) {
    doc.page.drawText(col.label, {
      x: ccx,
      y: doc.y - 6,
      size: 7,
      font: fontBold,
      color: WHITE,
    });
    ccx += col.w;
  }
  doc.y -= 18;

  for (let i = 0; i < suppliers.length; i++) {
    const sup = suppliers[i];
    const ranking = summary.rankings.find((r) => r.supplier.id === sup.id);
    const rowH = sup.notes ? 29 : 19;
    doc.ensureSpace(rowH + 6);
    const pageRow = doc.page;

    if (i % 2 === 1) {
      pageRow.drawRectangle({
        x: MARGIN_X,
        y: doc.y - rowH + 6,
        width: contentWidth,
        height: rowH,
        color: PAPER_ALT,
      });
    }

    let x = MARGIN_X + 4;
    const nameFit = fitText(sup.name || "Fornecedor", fontBold, 7.6, condCols[0].w - 6);
    pageRow.drawText(nameFit.text, {
      x,
      y: doc.y - 6,
      size: nameFit.size,
      font: fontBold,
      color: INK,
    });
    if (sup.notes) {
      const notesFit = fitText(sup.notes, fontRegular, 6.4, condCols[0].w - 6);
      pageRow.drawText(notesFit.text, {
        x,
        y: doc.y - 16,
        size: notesFit.size,
        font: fontRegular,
        color: SLATE,
      });
    }
    x += condCols[0].w;

    const totalTxt = cleanPdfText(formatCurrency(ranking?.total ?? null));
    const totalFit = fitText(totalTxt, fontBold, 7.6, condCols[1].w - 5);
    pageRow.drawText(totalFit.text, {
      x,
      y: doc.y - 6,
      size: totalFit.size,
      font: fontBold,
      color: ranking?.isBest ? SUCCESS : INK,
    });
    x += condCols[1].w;

    pageRow.drawText(ranking ? `${ranking.coverage}/${items.length}` : "-", {
      x,
      y: doc.y - 6,
      size: 7.4,
      font: fontRegular,
      color: SLATE,
    });
    x += condCols[2].w;

    pageRow.drawText(
      truncateText(sup.deliveryDays || "-", fontRegular, 6.9, condCols[3].w - 5),
      { x, y: doc.y - 6, size: 6.9, font: fontRegular, color: TEXT_DARK }
    );
    x += condCols[3].w;

    pageRow.drawText(
      truncateText(sup.paymentTerms || "-", fontRegular, 6.9, condCols[4].w - 5),
      { x, y: doc.y - 6, size: 6.9, font: fontRegular, color: TEXT_DARK }
    );
    x += condCols[4].w;

    pageRow.drawText(
      truncateText(sup.validity || "-", fontRegular, 6.9, condCols[5].w - 5),
      { x, y: doc.y - 6, size: 6.9, font: fontRegular, color: TEXT_DARK }
    );
    x += condCols[5].w;

    pageRow.drawText(
      truncateText(sup.contact || "-", fontRegular, 6.6, condCols[6].w - 3),
      { x, y: doc.y - 6, size: 6.6, font: fontRegular, color: SLATE }
    );

    pageRow.drawLine({
      start: { x: MARGIN_X, y: doc.y - rowH + 6 },
      end: { x: PAGE_W - MARGIN_X, y: doc.y - rowH + 6 },
      thickness: 0.4,
      color: LINE,
    });
    doc.y -= rowH;
  }

  doc.y -= 14;

  // ---- Section 3: technical analysis + KPI box ---------------------------
  drawSectionTitle("3 - Analise tecnica, recomendacao e indicadores");

  const leftColW = contentWidth * 0.65;
  const rightColW = contentWidth - leftColW - 12;
  const summaryLines = wrapText(
    quotation.analysis.summary || "Analise tecnica pendente.",
    fontRegular,
    8.2,
    leftColW - 16
  );
  const recLines = wrapText(
    quotation.analysis.recommendation || "Recomendacao pendente.",
    fontBold,
    8.2,
    leftColW - 16
  );
  const analysisBoxH = Math.max(104, 34 + (summaryLines.length + recLines.length) * 10.2);

  doc.ensureSpace(analysisBoxH + 14);

  // Left analysis box
  doc.page.drawRectangle({
    x: MARGIN_X,
    y: doc.y - analysisBoxH,
    width: leftColW,
    height: analysisBoxH,
    borderColor: LINE,
    borderWidth: 0.8,
    color: WHITE,
  });
  doc.page.drawText("PARECER DA GOVERNANCA", {
    x: MARGIN_X + 8,
    y: doc.y - 13,
    size: 6.5,
    font: fontBold,
    color: SLATE,
  });
  let ay = doc.y - 24;
  for (const line of summaryLines) {
    doc.page.drawText(line, {
      x: MARGIN_X + 8,
      y: ay,
      size: 8.2,
      font: fontRegular,
      color: TEXT_DARK,
    });
    ay -= 10.2;
  }
  ay -= 3;
  doc.page.drawLine({
    start: { x: MARGIN_X + 8, y: ay + 6 },
    end: { x: MARGIN_X + leftColW - 8, y: ay + 6 },
    thickness: 0.5,
    color: LINE,
  });
  for (const line of recLines) {
    doc.page.drawText(line, {
      x: MARGIN_X + 8,
      y: ay - 3,
      size: 8.2,
      font: fontBold,
      color: INK,
    });
    ay -= 10.2;
  }

  // Right KPI box
  const kx = MARGIN_X + leftColW + 12;
  doc.page.drawRectangle({
    x: kx,
    y: doc.y - analysisBoxH,
    width: rightColW,
    height: analysisBoxH,
    borderColor: LINE,
    borderWidth: 0.8,
    color: PAPER,
  });
  doc.page.drawText("MELHOR PROPOSTA", {
    x: kx + 10,
    y: doc.y - 14,
    size: 6.5,
    font: fontBold,
    color: SLATE,
  });
  const bestNameFit = fitText(
    summary.best?.supplier.name || "-",
    fontBold,
    9.5,
    rightColW - 20
  );
  doc.page.drawText(bestNameFit.text, {
    x: kx + 10,
    y: doc.y - 26,
    size: bestNameFit.size,
    font: fontBold,
    color: INK,
  });
  doc.page.drawText(cleanPdfText(formatCurrency(summary.best?.total ?? null)), {
    x: kx + 10,
    y: doc.y - 42,
    size: 13,
    font: fontBold,
    color: SUCCESS,
  });

  doc.page.drawLine({
    start: { x: kx + 10, y: doc.y - 50 },
    end: { x: kx + rightColW - 10, y: doc.y - 50 },
    thickness: 0.6,
    color: LINE,
  });
  doc.page.drawText("ECONOMIA POTENCIAL", {
    x: kx + 10,
    y: doc.y - 62,
    size: 6.5,
    font: fontBold,
    color: SLATE,
  });
  doc.page.drawText(cleanPdfText(formatCurrency(summary.savings)), {
    x: kx + 10,
    y: doc.y - 76,
    size: 11.5,
    font: fontBold,
    color: INK,
  });
  if (summary.savings > 0) {
    doc.page.drawText(`${summary.savingsPercent.toFixed(1)}% frente a maior proposta`, {
      x: kx + 10,
      y: doc.y - 87,
      size: 7.2,
      font: fontRegular,
      color: SLATE,
    });
  }
  doc.page.drawLine({
    start: { x: kx + 10, y: doc.y - analysisBoxH + 26 },
    end: { x: kx + rightColW - 10, y: doc.y - analysisBoxH + 26 },
    thickness: 0.5,
    color: LINE,
  });
  doc.page.drawText(`${items.length} item(ns)`, {
    x: kx + 10,
    y: doc.y - analysisBoxH + 14,
    size: 7,
    font: fontBold,
    color: SLATE,
  });
  const propostasLabel = `${suppliers.length} proposta(s)`;
  doc.page.drawText(propostasLabel, {
    x: kx + rightColW - 10 - fontBold.widthOfTextAtSize(propostasLabel, 7),
    y: doc.y - analysisBoxH + 14,
    size: 7,
    font: fontBold,
    color: SLATE,
  });

  doc.y = doc.y - analysisBoxH - 12;

  // Confirmed outcome bar
  const confirmedDiff = recordedSavings(quotation);
  if (confirmedDiff !== null && quotation.analysis.outcome) {
    const chosenSup =
      quotation.suppliers.find((s) => s.id === quotation.analysis.outcome.supplierId)
        ?.name || "-";
    const outcomeText = cleanPdfText(
      `Fornecedor: ${chosenSup} | Referencia: ${formatCurrency(
        quotation.analysis.outcome.referenceAmount
      )} | Contratado: ${formatCurrency(
        quotation.analysis.outcome.contractedAmount
      )} | Diferenca: ${formatCurrency(confirmedDiff)}`
    );
    const lines = wrapText(outcomeText, fontBold, 7.6, contentWidth - 16);
    const boxH = 16 + lines.length * 10;
    doc.ensureSpace(boxH + 8);
    doc.page.drawRectangle({
      x: MARGIN_X,
      y: doc.y - boxH,
      width: contentWidth,
      height: boxH,
      borderColor: LINE,
      borderWidth: 0.8,
      color: PAPER,
    });
    doc.page.drawText("RESULTADO CONFIRMADO DA CONTRATACAO", {
      x: MARGIN_X + 8,
      y: doc.y - 10,
      size: 6.5,
      font: fontBold,
      color: BRAND_DARK,
    });
    let oy = doc.y - 21;
    for (const line of lines) {
      doc.page.drawText(line, {
        x: MARGIN_X + 8,
        y: oy,
        size: 7.6,
        font: fontBold,
        color: INK,
      });
      oy -= 10;
    }
    doc.y -= boxH + 8;
  }

  // ---- Section 4: notes + signatures --------------------------------------
  drawSectionTitle("4 - Observacoes e aprovacao");

  const notesLines = wrapText(
    quotation.analysis.notes || "Sem observacoes adicionais registradas.",
    fontRegular,
    8,
    contentWidth - 16
  );
  const notesH = Math.max(30, 14 + notesLines.length * 10.2);
  doc.ensureSpace(notesH + 78);

  doc.page.drawRectangle({
    x: MARGIN_X,
    y: doc.y - notesH,
    width: contentWidth,
    height: notesH,
    borderColor: LINE,
    borderWidth: 0.8,
    color: WHITE,
  });
  let ny = doc.y - 12;
  for (const line of notesLines) {
    doc.page.drawText(line, {
      x: MARGIN_X + 8,
      y: ny,
      size: 8,
      font: fontRegular,
      color: TEXT_DARK,
    });
    ny -= 10.2;
  }

  doc.y -= notesH + 40;

  const sigW = (contentWidth - 36) / 3;
  const sigs = [
    { role: "ANALISTA RESPONSAVEL", org: "Gerencial - Governanca Condominial" },
    { role: "SINDICO(A)", org: "Aprovacao da assembleia / conselho" },
    { role: "CONSELHO CONSULTIVO", org: "Ciencia e validacao" },
  ];
  sigs.forEach((sig, i) => {
    const sx = MARGIN_X + i * (sigW + 18);
    doc.page.drawLine({
      start: { x: sx, y: doc.y },
      end: { x: sx + sigW, y: doc.y },
      thickness: 0.7,
      color: SLATE,
    });
    doc.page.drawText(sig.role, {
      x: sx,
      y: doc.y - 11,
      size: 7.2,
      font: fontBold,
      color: INK,
    });
    doc.page.drawText(sig.org, {
      x: sx,
      y: doc.y - 20,
      size: 6.6,
      font: fontRegular,
      color: SLATE,
    });
  });

  doc.drawFooterAll(
    fontRegular,
    `Gerencial - Governanca Condominial - gerado em ${formatDateBR(
      new Date().toISOString().slice(0, 10)
    )} - protocolo ${quotation.protocol}`
  );

  return pdfDoc.save();
}

export async function generateIndicatorsPdf(params: {
  quotations: QuotationRecord[];
  condominiumFilter: string;
  startDate: string;
  endDate: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await embedLogo(pdfDoc);

  const doc = new PdfBuilder(pdfDoc);
  const { page } = doc;
  const contentWidth = doc.contentWidth;

  // Header
  page.drawRectangle({ x: 0, y: PAGE_H - 78, width: PAGE_W, height: 78, color: INK });
  page.drawRectangle({ x: 0, y: PAGE_H - 82, width: PAGE_W, height: 4, color: BRAND });

  if (logoImage) {
    const dims = logoImage.scaleToFit(136, 24);
    page.drawImage(logoImage, {
      x: MARGIN_X,
      y: PAGE_H - 38,
      width: dims.width,
      height: dims.height,
    });
  } else {
    page.drawText("GERENCIAL", {
      x: MARGIN_X,
      y: PAGE_H - 38,
      size: 15,
      font: fontBold,
      color: WHITE,
    });
  }
  const title = "Indicadores para Assembleia";
  page.drawText(title, {
    x: PAGE_W - MARGIN_X - fontBold.widthOfTextAtSize(title, 16),
    y: PAGE_H - 40,
    size: 16,
    font: fontBold,
    color: WHITE,
  });
  const sub = cleanPdfText(
    `${params.condominiumFilter || "Todos os condominios"} | ${
      params.startDate ? formatDateBR(params.startDate) : "Inicio"
    } a ${params.endDate ? formatDateBR(params.endDate) : "hoje"}`
  );
  page.drawText(sub, {
    x: PAGE_W - MARGIN_X - fontRegular.widthOfTextAtSize(sub, 8),
    y: PAGE_H - 56,
    size: 8,
    font: fontRegular,
    color: BRAND,
  });

  doc.y = PAGE_H - 104;

  let confirmedTotal = 0;
  let confirmedCount = 0;
  let potentialTotal = 0;
  let comparableCount = 0;
  let concludedCount = 0;
  let pricedProposals = 0;

  for (const q of params.quotations) {
    const s = computeSummary(q);
    if (s.isComparable) {
      potentialTotal += s.savings;
      comparableCount += 1;
    }
    if (q.status === "concluido") concludedCount += 1;
    pricedProposals += s.pricedSupplierCount;
    const rec = recordedSavings(q);
    if (rec !== null) {
      confirmedTotal += rec;
      confirmedCount += 1;
    }
  }

  const cardW = (contentWidth - 24) / 4;
  const kpis = [
    {
      label: "ECONOMIA CONFIRMADA",
      value: confirmedCount > 0 ? formatCurrency(confirmedTotal) : "-",
      sub: `${confirmedCount} contratacao(oes)`,
      dark: true,
    },
    {
      label: "ECONOMIA POTENCIAL",
      value: formatCurrency(potentialTotal),
      sub: `${comparableCount} comparativo(s)`,
      dark: false,
    },
    {
      label: "MAPAS DE COTACAO",
      value: String(params.quotations.length),
      sub: `${concludedCount} concluido(s)`,
      dark: false,
    },
    {
      label: "PROPOSTAS COM VALOR",
      value: String(pricedProposals),
      sub: "Fornecedores cotados",
      dark: false,
    },
  ];

  kpis.forEach((k, i) => {
    const kx = MARGIN_X + i * (cardW + 8);
    page.drawRectangle({
      x: kx,
      y: doc.y - 62,
      width: cardW,
      height: 62,
      color: k.dark ? INK : PAPER,
      borderColor: k.dark ? INK : LINE,
      borderWidth: 0.8,
    });
    page.drawText(k.label, {
      x: kx + 8,
      y: doc.y - 14,
      size: 6,
      font: fontBold,
      color: k.dark ? BRAND : SLATE,
    });
    const valueFit = fitText(k.value, fontBold, 11, cardW - 16);
    page.drawText(valueFit.text, {
      x: kx + 8,
      y: doc.y - 34,
      size: valueFit.size,
      font: fontBold,
      color: k.dark ? WHITE : INK,
    });
    page.drawText(cleanPdfText(k.sub), {
      x: kx + 8,
      y: doc.y - 50,
      size: 6.6,
      font: fontRegular,
      color: k.dark ? rgb(0.75, 0.78, 0.85) : SLATE,
    });
  });

  doc.y -= 84;

  page.drawText("DETALHAMENTO DOS MAPAS NO PERIODO", {
    x: MARGIN_X,
    y: doc.y,
    size: 8.5,
    font: fontBold,
    color: INK,
  });
  doc.y -= 14;

  page.drawRectangle({
    x: MARGIN_X,
    y: doc.y - 18 + 6,
    width: contentWidth,
    height: 18,
    color: INK,
  });
  const cols = [
    { label: "PROTOCOLO", w: 66 },
    { label: "CONDOMINIO / OBJETO", w: 205 },
    { label: "DATA", w: 54 },
    { label: "MELHOR PROPOSTA", w: contentWidth - 66 - 205 - 54 - 86 },
    { label: "ECONOMIA", w: 86 },
  ];
  let cx = MARGIN_X + 4;
  for (const col of cols) {
    page.drawText(col.label, { x: cx, y: doc.y - 6, size: 7, font: fontBold, color: WHITE });
    cx += col.w;
  }
  doc.y -= 18;

  for (let i = 0; i < params.quotations.length; i++) {
    const q = params.quotations[i];
    const s = computeSummary(q);
    if (doc.y - 30 < BOTTOM_LIMIT) {
      doc.page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      doc.pages.push(doc.page);
      doc.y = PAGE_H - 36;
    }
    const rowH = 26;
    const pageRow = doc.page;

    if (i % 2 === 1) {
      pageRow.drawRectangle({
        x: MARGIN_X,
        y: doc.y - rowH + 6,
        width: contentWidth,
        height: rowH,
        color: PAPER_ALT,
      });
    }
    let rx = MARGIN_X + 4;
    pageRow.drawText(cleanPdfText(q.protocol), {
      x: rx,
      y: doc.y - 6,
      size: 7.2,
      font: fontBold,
      color: SLATE,
    });
    rx += cols[0].w;
    pageRow.drawText(
      truncateText(q.condominium, fontBold, 7.4, cols[1].w - 6),
      { x: rx, y: doc.y - 6, size: 7.4, font: fontBold, color: INK }
    );
    pageRow.drawText(truncateText(q.service, fontRegular, 6.8, cols[1].w - 6), {
      x: rx,
      y: doc.y - 16,
      size: 6.8,
      font: fontRegular,
      color: SLATE,
    });
    rx += cols[1].w;
    pageRow.drawText(formatDateBR(q.analysisDate), {
      x: rx,
      y: doc.y - 6,
      size: 7.2,
      font: fontRegular,
      color: TEXT_DARK,
    });
    rx += cols[2].w;
    pageRow.drawText(
      truncateText(
        s.best ? `${s.best.supplier.name} (${formatCurrency(s.best.total)})` : "-",
        fontRegular,
        7.2,
        cols[3].w - 6
      ),
      { x: rx, y: doc.y - 6, size: 7.2, font: fontRegular, color: INK }
    );
    rx += cols[3].w;
    pageRow.drawText(cleanPdfText(s.isComparable ? formatCurrency(s.savings) : "-"), {
      x: rx,
      y: doc.y - 6,
      size: 7.4,
      font: fontBold,
      color: s.savings > 0 ? SUCCESS : SLATE,
    });

    pageRow.drawLine({
      start: { x: MARGIN_X, y: doc.y - rowH + 6 },
      end: { x: PAGE_W - MARGIN_X, y: doc.y - rowH + 6 },
      thickness: 0.35,
      color: LINE,
    });
    doc.y -= rowH;
  }

  doc.drawFooterAll(
    fontRegular,
    `Gerencial - Governanca Condominial - Indicadores para assembleia - ${new Date().toLocaleDateString(
      "pt-BR"
    )}`
  );

  return pdfDoc.save();
}
