import PDFDocument from "pdfkit";
import { GERENCIAL_LOGO_PNG } from "@/lib/brand-assets";
import { COST_TYPE_LABEL } from "@/lib/constants";
import type { QuotationDraft, QuotationRecord } from "@/lib/types";
import {
  computeMetrics,
  formatCurrency,
  formatDateBR,
  recordedSavings,
  supplierCostBreakdown,
  supplierTotal,
} from "@/lib/quotation";

const C = {
  ink: "#181447",
  gold: "#FAB12A",
  paper: "#F6F4EE",
  line: "#DDD9CC",
  text: "#302F42",
  muted: "#777689",
  green: "#0E4828",
  greenLight: "#E7F0E9",
  amberLight: "#FDF3DE",
  white: "#FFFFFF",
};
const MARGIN = 34;

type PdfDoc = InstanceType<typeof PDFDocument>;

function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\u0000-\u00FF\n\r\t]/g, "-");
}

export async function renderPdf(
  title: string,
  draw: (doc: PdfDoc) => void,
  layout: "portrait" | "landscape" = "landscape",
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout,
    margins: { top: MARGIN, right: MARGIN, bottom: 42, left: MARGIN },
    bufferPages: true,
    compress: true,
    info: { Title: safeText(title), Author: "Gerencial · Governança Condominial", Creator: "Gerencial Mapa de Cotação" },
  });
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    doc.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      draw(doc);
      addPageFooters(doc);
      doc.end();
    } catch (error) {
      doc.destroy(error instanceof Error ? error : new Error("Falha ao gerar PDF."));
    }
  });
}

function addPageFooters(doc: PdfDoc) {
  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    const width = doc.page.width;
    const height = doc.page.height;
    doc.save();
    doc.strokeColor(C.line).lineWidth(0.6).moveTo(MARGIN, height - 31).lineTo(width - MARGIN, height - 31).stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted)
      .text("Gerencial · Governança Condominial", MARGIN, height - 23, { lineBreak: false });
    doc.text(`${page - range.start + 1} / ${range.count}`, width - MARGIN - 60, height - 23, { width: 60, align: "right", lineBreak: false });
    doc.restore();
  }
}

function drawBrandBand(doc: PdfDoc, title: string, subtitle: string, protocol?: string, continuation = false) {
  const width = doc.page.width;
  const height = continuation ? 54 : 90;
  doc.save();
  doc.rect(0, 0, width, height).fill(C.ink);
  doc.rect(0, height, width, 4).fill(C.gold);
  try {
    doc.image(Buffer.from(GERENCIAL_LOGO_PNG, "base64"), MARGIN, continuation ? 12 : 22, { fit: continuation ? [145, 27] : [178, 34] });
  } catch {
    doc.font("Helvetica-Bold").fontSize(19).fillColor(C.white).text("GERENCIAL", MARGIN, continuation ? 17 : 24);
  }
  const rightX = continuation ? width - 255 : width - 340;
  doc.font("Helvetica-Bold").fontSize(continuation ? 11 : 17).fillColor(C.white)
    .text(safeText(title), rightX, continuation ? 15 : 24, { width: 255, align: "right", ellipsis: true });
  doc.font("Helvetica").fontSize(8.5).fillColor(C.gold)
    .text(safeText(subtitle), rightX, continuation ? 31 : 48, { width: 255, align: "right", ellipsis: true });
  if (protocol && !continuation) {
    doc.roundedRect(width - MARGIN - 150, 64, 150, 17, 4).fill(C.gold);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.ink)
      .text(`PROTOCOLO  ${safeText(protocol)}`, width - MARGIN - 146, 68, { width: 142, align: "center", lineBreak: false });
  }
  doc.restore();
}

function addNewPage(doc: PdfDoc, title: string, subtitle: string) {
  doc.addPage({ size: "A4", layout: "landscape", margins: { top: MARGIN, right: MARGIN, bottom: 42, left: MARGIN } });
  drawBrandBand(doc, title, subtitle, undefined, true);
  doc.y = 70;
}

function drawSectionTitle(doc: PdfDoc, title: string, y: number, width: number) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.ink).text(safeText(title.toUpperCase()), MARGIN, y, { width: width - MARGIN, lineBreak: false });
  doc.strokeColor(C.gold).lineWidth(1.7).moveTo(MARGIN, y + 14).lineTo(width - MARGIN, y + 14).stroke();
  return y + 21;
}

function drawField(doc: PdfDoc, label: string, value: string, x: number, y: number, width: number, height = 39) {
  doc.roundedRect(x, y, width, height, 4).fill(C.paper);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text(safeText(label.toUpperCase()), x + 8, y + 6, { width: width - 16, lineBreak: false, ellipsis: true });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.ink).text(safeText(value || "—"), x + 8, y + 17, { width: width - 16, height: height - 19, ellipsis: true, lineGap: 1 });
}

function textHeight(doc: PdfDoc, text: string, width: number, size: number, bold = false): number {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
  return doc.heightOfString(safeText(text), { width: Math.max(12, width), lineGap: 1 });
}

function sectionWithPage(doc: PdfDoc, y: number, needed: number, title: string, subtitle: string, pageTitle: string): number {
  const maxY = doc.page.height - 49;
  if (y + needed > maxY) {
    addNewPage(doc, pageTitle, subtitle);
    y = doc.y;
  }
  return y;
}

function drawComparisonTable(doc: PdfDoc, record: QuotationRecord): number {
  const pageWidth = doc.page.width;
  const totalWidth = pageWidth - 2 * MARGIN;
  const descWidth = Math.min(242, totalWidth * 0.32);
  const qtyWidth = 40;
  const unitWidth = 44;
  const suppliers = record.suppliers;
  const supplierWidth = (totalWidth - descWidth - qtyWidth - unitWidth) / Math.max(1, suppliers.length);
  const cols = [descWidth, qtyWidth, unitWidth, ...suppliers.map(() => supplierWidth)];
  const labels = ["Item / composição", "Qtd", "Un." , ...suppliers.map((supplier) => supplier.name || "Fornecedor")];

  const drawHeader = (y: number) => {
    let x = MARGIN;
    const h = 31;
    labels.forEach((label, index) => {
      doc.rect(x, y, cols[index], h).fill(C.ink);
      doc.font("Helvetica-Bold").fontSize(index >= 3 ? 7 : 7.5).fillColor(index >= 3 ? C.gold : C.white)
        .text(safeText(label), x + 4, y + 6, { width: cols[index] - 8, height: h - 9, align: index === 1 || index >= 3 ? "center" : "left", ellipsis: true, lineGap: 1 });
      x += cols[index];
    });
    return y + h;
  };

  let y = sectionWithPage(doc, doc.y, 54, "1. Comparativo de propostas", "Mapa de cotação", `Mapa ${record.protocol}`);
  y = drawSectionTitle(doc, "1. Comparativo de propostas · preços em R$", y, pageWidth);
  y = drawHeader(y);

  record.items.forEach((item, rowIndex) => {
    const type = item.costType === "mao_obra" || item.costType === "material" ? COST_TYPE_LABEL[item.costType] : COST_TYPE_LABEL.nao_discriminado;
    const description = `${item.description || "Item sem descrição"}\n${type}`;
    const descHeight = textHeight(doc, description, descWidth - 12, 7.3);
    const height = Math.max(25, descHeight + 10);
    if (y + height > doc.page.height - 49) {
      addNewPage(doc, `Mapa ${record.protocol}`, "Continuação do comparativo");
      y = doc.y;
      y = drawHeader(y);
    }
    const lowPrices = suppliers.map((supplier) => item.prices[supplier.id]).filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
    const min = lowPrices.length ? Math.min(...lowPrices) : null;
    const bg = rowIndex % 2 === 0 ? C.white : "#F8F7F2";
    let x = MARGIN;
    cols.forEach((width) => {
      doc.rect(x, y, width, height).fill(bg).strokeColor(C.line).lineWidth(0.35).stroke();
      x += width;
    });
    x = MARGIN;
    doc.font("Helvetica").fontSize(7.3).fillColor(C.text).text(safeText(description), x + 6, y + 5, { width: descWidth - 12, height: height - 7, lineGap: 1 });
    x += descWidth;
    doc.font("Helvetica").fontSize(8).fillColor(C.text).text(String(item.quantity), x + 3, y + 8, { width: qtyWidth - 6, align: "center", lineBreak: false });
    x += qtyWidth;
    doc.font("Helvetica").fontSize(7.5).fillColor(C.text).text(safeText(item.unit), x + 3, y + 8, { width: unitWidth - 6, align: "center", lineBreak: false, ellipsis: true });
    x += unitWidth;
    suppliers.forEach((supplier) => {
      const value = item.prices[supplier.id] ?? null;
      const isLow = value !== null && min !== null && Math.abs(value - min) < 0.005;
      if (isLow) doc.rect(x, y, supplierWidth, height).fill(C.greenLight);
      doc.font(isLow ? "Helvetica-Bold" : "Helvetica").fontSize(7.2).fillColor(isLow ? C.green : C.text)
        .text(formatCurrency(value), x + 3, y + 8, { width: supplierWidth - 6, align: "right", lineBreak: false, ellipsis: true });
      x += supplierWidth;
    });
    y += height;
  });

  const totalsHeight = 20;
  if (y + totalsHeight * 4 > doc.page.height - 49) {
    addNewPage(doc, `Mapa ${record.protocol}`, "Continuação dos totais");
    y = doc.y;
    y = drawHeader(y);
  }
  const types = ["total", "mao_obra", "material", "nao_discriminado"] as const;
  const metrics = computeMetrics(record);
  const rowLabels = ["TOTAL GERAL", "MÃO DE OBRA", "MATERIAL", "NÃO DISCRIMINADO"];
  types.forEach((type, index) => {
    let x = MARGIN;
    const isTotal = type === "total";
    const fill = isTotal ? C.ink : index % 2 === 0 ? C.paper : C.white;
    const color = isTotal ? C.white : C.text;
    const labelWidth = descWidth + qtyWidth + unitWidth;
    doc.rect(x, y, labelWidth, totalsHeight).fill(fill).strokeColor(C.line).lineWidth(0.3).stroke();
    doc.font("Helvetica-Bold").fontSize(isTotal ? 7.5 : 7).fillColor(color).text(rowLabels[index], x + 6, y + 6, { width: labelWidth - 12, align: "right", lineBreak: false });
    x += labelWidth;
    suppliers.forEach((supplier) => {
      let total: number | null;
      if (isTotal) total = supplierTotal(record.items, supplier.id);
      else total = supplierCostBreakdown(record.items, supplier.id)[type].total;
      const isBest = isTotal && metrics.isComparable && metrics.best?.supplier.id === supplier.id;
      doc.rect(x, y, supplierWidth, totalsHeight).fill(isBest ? C.greenLight : fill).strokeColor(C.line).lineWidth(0.3).stroke();
      doc.font(isTotal || isBest ? "Helvetica-Bold" : "Helvetica").fontSize(7.1).fillColor(isBest ? C.green : color)
        .text(formatCurrency(total), x + 3, y + 6, { width: supplierWidth - 6, align: "right", lineBreak: false, ellipsis: true });
      x += supplierWidth;
    });
    y += totalsHeight;
  });
  return y + 8;
}

function drawQuotationPdf(doc: PdfDoc, record: QuotationRecord) {
  const width = doc.page.width;
  drawBrandBand(doc, "Mapa de Cotação", "Processo comparativo de propostas", record.protocol);
  let y = 105;
  const gap = 8;
  const fieldW = (width - 2 * MARGIN - gap * 3) / 4;
  drawField(doc, "Condomínio / Associação", record.condominium, MARGIN, y, fieldW * 2 + gap, 39);
  drawField(doc, "Data de análise", formatDateBR(record.analysisDate), MARGIN + fieldW * 2 + gap * 2, y, fieldW, 39);
  drawField(doc, "Natureza · Categoria", `${record.kind === "produtos" ? "Produtos" : "Serviço"} · ${record.category}`, MARGIN + fieldW * 3 + gap * 3, y, fieldW, 39);
  y += 46;
  drawField(doc, "A/C", record.recipient, MARGIN, y, fieldW, 37);
  drawField(doc, "Serviço / Objeto", record.service, MARGIN + fieldW + gap, y, fieldW * 3 + gap * 2, 37);
  y += 43;
  const description = record.description || "Sem descrição adicional registrada.";
  const descHeight = textHeight(doc, description, width - 2 * MARGIN - 16, 8);
  const safeY = sectionWithPage(doc, y, descHeight + 29, "Descrição do escopo", record.protocol, `Mapa ${record.protocol}`);
  if (safeY !== y) y = safeY;
  doc.roundedRect(MARGIN, y, width - 2 * MARGIN, descHeight + 20, 4).fill(C.paper);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("DESCRIÇÃO DO ESCOPO", MARGIN + 8, y + 6);
  doc.font("Helvetica").fontSize(8).fillColor(C.text).text(safeText(description), MARGIN + 8, y + 17, { width: width - 2 * MARGIN - 16, lineGap: 1 });
  y += descHeight + 29;

  y = drawComparisonTableAt(doc, record, y);

  const suppliers = record.suppliers;
  const condTitleY = sectionWithPage(doc, y, 55, "Condições comerciais", record.protocol, `Mapa ${record.protocol}`);
  y = drawSectionTitle(doc, "2. Condições comerciais e cobertura", condTitleY, width);
  const columns = suppliers.length > 2 ? 2 : Math.max(1, suppliers.length);
  const cardGap = 9;
  const cardWidth = (width - 2 * MARGIN - cardGap * (columns - 1)) / columns;
  for (let i = 0; i < suppliers.length; i += columns) {
    const group = suppliers.slice(i, i + columns);
    const cards = group.map((supplier) => {
      const ranking = computeMetrics(record).rankings.find((row) => row.supplier.id === supplier.id);
      const lines = [
        `Proposta completa: ${formatCurrency(ranking && ranking.coverage === record.items.length ? ranking.total : null)}`,
        `Cobertura: ${ranking?.coverage ?? 0}/${record.items.length} itens`,
        `Entrega / execução: ${supplier.deliveryDays || "—"}`,
        `Pagamento: ${supplier.paymentTerms || "—"}`,
        `Validade: ${supplier.validity || "—"}`,
        `Contato: ${supplier.contact || "—"}`,
        supplier.notes ? `Observações: ${supplier.notes}` : "",
      ].filter(Boolean);
      return { supplier, lines: lines.join("\n") };
    });
    const cardH = Math.max(...cards.map((card) => textHeight(doc, card.lines, cardWidth - 20, 7.6) + 30), 54);
    if (y + cardH > doc.page.height - 54) {
      addNewPage(doc, `Mapa ${record.protocol}`, "Condições comerciais");
      y = doc.y;
      y = drawSectionTitle(doc, "2. Condições comerciais e cobertura", y, width);
    }
    cards.forEach((card, position) => {
      const x = MARGIN + position * (cardWidth + cardGap);
      doc.roundedRect(x, y, cardWidth, cardH, 5).fill(position === 0 && computeMetrics(record).best?.supplier.id === card.supplier.id ? C.greenLight : C.paper);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.ink).text(safeText(card.supplier.name || "Fornecedor"), x + 9, y + 8, { width: cardWidth - 18, ellipsis: true, lineBreak: false });
      doc.font("Helvetica").fontSize(7.6).fillColor(C.text).text(safeText(card.lines), x + 9, y + 22, { width: cardWidth - 18, lineGap: 1 });
    });
    y += cardH + cardGap;
  }

  const analysis = record.analysis;
  const best = computeMetrics(record).best;
  const compactY = sectionWithPage(doc, y, 150, "Parecer técnico", record.protocol, `Mapa ${record.protocol}`);
  y = drawSectionTitle(doc, "3. Análise técnica e recomendação", compactY, width);
  const analysisText = [analysis.summary || "Sem parecer registrado.", analysis.recommendation ? `RECOMENDAÇÃO: ${analysis.recommendation}` : ""].filter(Boolean).join("\n\n");
  const analysisHeight = textHeight(doc, analysisText, (width - 2 * MARGIN) * 0.66 - 22, 8);
  const indicatorsHeight = 71;
  const boxHeight = Math.max(analysisHeight + 20, indicatorsHeight);
  if (y + boxHeight > doc.page.height - 110) { addNewPage(doc, `Mapa ${record.protocol}`, "Análise e aprovação"); y = doc.y; }
  const leftWidth = (width - 2 * MARGIN) * 0.68;
  const rightWidth = width - 2 * MARGIN - leftWidth - 9;
  doc.roundedRect(MARGIN, y, leftWidth, boxHeight, 5).fill(C.white).strokeColor(C.line).lineWidth(0.7).stroke();
  doc.font("Helvetica").fontSize(8).fillColor(C.text).text(safeText(analysisText), MARGIN + 10, y + 10, { width: leftWidth - 20, lineGap: 2 });
  const rightX = MARGIN + leftWidth + 9;
  doc.roundedRect(rightX, y, rightWidth, boxHeight, 5).fill(C.ink);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.gold).text("PROPOSTA COMPLETA DE MENOR VALOR", rightX + 9, y + 9, { width: rightWidth - 18, lineBreak: false, ellipsis: true });
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.white).text(safeText(best?.supplier.name || "Aguardando propostas completas"), rightX + 9, y + 23, { width: rightWidth - 18, height: 24, ellipsis: true });
  doc.font("Helvetica-Bold").fontSize(12).fillColor(C.gold).text(formatCurrency(best?.total ?? null), rightX + 9, y + 49, { width: rightWidth - 18 });
  y += boxHeight + 9;

  const metrics = computeMetrics(record);
  const outcome = recordedSavings(record);
  const extra = outcome !== null && record.analysis.outcome
    ? `Resultado confirmado: referência ${formatCurrency(record.analysis.outcome.referenceAmount)}; contratado ${formatCurrency(record.analysis.outcome.contractedAmount)}; diferença ${formatCurrency(outcome)}.`
    : `Economia potencial: ${formatCurrency(metrics.savings)}${metrics.isComparable ? ` (${metrics.savingsPercent.toFixed(1)}% frente à maior proposta completa)` : " — exige duas propostas completas"}.`;
  if (y + 32 > doc.page.height - 100) { addNewPage(doc, `Mapa ${record.protocol}`, "Observações e aprovação"); y = doc.y; }
  doc.roundedRect(MARGIN, y, width - 2 * MARGIN, 30, 4).fill(C.amberLight);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.ink).text(safeText(extra), MARGIN + 9, y + 10, { width: width - 2 * MARGIN - 18, ellipsis: true });
  y += 38;

  if (analysis.notes) {
    const notesH = textHeight(doc, analysis.notes, width - 2 * MARGIN - 16, 7.7);
    const noteY = sectionWithPage(doc, y, notesH + 35, "Observações", record.protocol, `Mapa ${record.protocol}`);
    y = drawSectionTitle(doc, "Observações", noteY, width);
    doc.font("Helvetica").fontSize(7.7).fillColor(C.text).text(safeText(analysis.notes), MARGIN, y + 4, { width: width - 2 * MARGIN, lineGap: 1 });
    y += notesH + 13;
  }

  const signY = sectionWithPage(doc, y, 48, "Aprovação", record.protocol, `Mapa ${record.protocol}`);
  const colWidth = (width - 2 * MARGIN - 36) / 3;
  ["Analista responsável", "Síndico(a)", "Conselho consultivo"].forEach((label, index) => {
    const x = MARGIN + index * (colWidth + 18);
    doc.moveTo(x, signY + 22).lineTo(x + colWidth, signY + 22).strokeColor(C.muted).lineWidth(0.7).stroke();
    doc.font("Helvetica-Bold").fontSize(7.3).fillColor(C.ink).text(label.toUpperCase(), x, signY + 27, { width: colWidth, align: "center" });
  });
}

function drawComparisonTableAt(doc: PdfDoc, record: QuotationRecord, initialY: number): number {
  const width = doc.page.width;
  const totalWidth = width - 2 * MARGIN;
  const supplierCount = Math.max(1, record.suppliers.length);
  const descWidth = Math.min(230, totalWidth * 0.30);
  const qtyWidth = 39;
  const unitWidth = 44;
  const priceWidth = (totalWidth - descWidth - qtyWidth - unitWidth) / supplierCount;
  const columns = [descWidth, qtyWidth, unitWidth, ...record.suppliers.map(() => priceWidth)];
  const drawHead = (y: number) => {
    let x = MARGIN;
    const labels = ["Item / custo", "Qtd", "Un.", ...record.suppliers.map((supplier) => supplier.name || "Fornecedor")];
    labels.forEach((label, i) => {
      doc.rect(x, y, columns[i], 27).fill(C.ink);
      doc.font("Helvetica-Bold").fontSize(6.8).fillColor(i >= 3 ? C.gold : C.white).text(safeText(label), x + 3, y + 6, { width: columns[i] - 6, height: 17, align: i >= 3 ? "center" : i === 1 ? "center" : "left", ellipsis: true });
      x += columns[i];
    });
    return y + 27;
  };
  let y = drawHead(initialY);
  for (const [index, item] of record.items.entries()) {
    const desc = `${item.description || "Item sem descrição"}\n${COST_TYPE_LABEL[item.costType ?? "nao_discriminado"]}`;
    const rowHeight = Math.max(25, textHeight(doc, desc, descWidth - 12, 7) + 9);
    if (y + rowHeight > doc.page.height - 55) { addNewPage(doc, `Mapa ${record.protocol}`, "Comparativo de propostas — continuação"); y = drawHead(doc.y); }
    const rowBg = index % 2 === 0 ? C.white : C.paper;
    let x = MARGIN;
    columns.forEach((w) => { doc.rect(x, y, w, rowHeight).fill(rowBg).strokeColor(C.line).lineWidth(0.35).stroke(); x += w; });
    x = MARGIN;
    doc.font("Helvetica").fontSize(7).fillColor(C.text).text(safeText(desc), x + 5, y + 5, { width: descWidth - 10, height: rowHeight - 6, lineGap: 1 });
    x += descWidth;
    doc.font("Helvetica").fontSize(7.5).fillColor(C.text).text(String(item.quantity), x + 2, y + 8, { width: qtyWidth - 4, align: "center" });
    x += qtyWidth;
    doc.font("Helvetica").fontSize(7).fillColor(C.text).text(safeText(item.unit), x + 2, y + 8, { width: unitWidth - 4, align: "center", ellipsis: true });
    x += unitWidth;
    const values = record.suppliers.map((supplier) => item.prices[supplier.id] ?? null).filter((value): value is number => value !== null);
    const min = values.length ? Math.min(...values) : null;
    record.suppliers.forEach((supplier) => {
      const value = item.prices[supplier.id] ?? null;
      const isMin = value !== null && min !== null && value === min;
      if (isMin) doc.rect(x, y, priceWidth, rowHeight).fill(C.greenLight);
      doc.font(isMin ? "Helvetica-Bold" : "Helvetica").fontSize(7).fillColor(isMin ? C.green : C.text).text(formatCurrency(value), x + 2, y + 8, { width: priceWidth - 4, align: "right", ellipsis: true });
      x += priceWidth;
    });
    y += rowHeight;
  }
  const metrics = computeMetrics(record);
  const summaryRows = [
    { title: "TOTAL GERAL", get: (id: string) => supplierTotal(record.items, id) },
    { title: "MÃO DE OBRA", get: (id: string) => supplierCostBreakdown(record.items, id).mao_obra.total },
    { title: "MATERIAL", get: (id: string) => supplierCostBreakdown(record.items, id).material.total },
    { title: "NÃO DISCRIMINADO", get: (id: string) => supplierCostBreakdown(record.items, id).nao_discriminado.total },
  ];
  for (const [index, row] of summaryRows.entries()) {
    if (y + 17 > doc.page.height - 53) { addNewPage(doc, `Mapa ${record.protocol}`, "Totais do comparativo"); y = drawHead(doc.y); }
    const isTotal = index === 0;
    const color = isTotal ? C.white : C.text;
    const fill = isTotal ? C.ink : (index % 2 ? C.paper : C.white);
    const labelWidth = descWidth + qtyWidth + unitWidth;
    doc.rect(MARGIN, y, labelWidth, 17).fill(fill).strokeColor(C.line).lineWidth(0.3).stroke();
    doc.font("Helvetica-Bold").fontSize(6.8).fillColor(color).text(row.title, MARGIN + 5, y + 5, { width: labelWidth - 10, align: "right" });
    let x = MARGIN + labelWidth;
    record.suppliers.forEach((supplier) => {
      const best = isTotal && metrics.isComparable && metrics.best?.supplier.id === supplier.id;
      doc.rect(x, y, priceWidth, 17).fill(best ? C.greenLight : fill).strokeColor(C.line).lineWidth(0.3).stroke();
      doc.font(isTotal ? "Helvetica-Bold" : "Helvetica").fontSize(6.8).fillColor(best ? C.green : color)
        .text(formatCurrency(row.get(supplier.id)), x + 2, y + 5, { width: priceWidth - 4, align: "right", ellipsis: true });
      x += priceWidth;
    });
    y += 17;
  }
  return y + 8;
}

function drawDashboardPdf(doc: PdfDoc, records: QuotationRecord[], filters: { condominium: string; start: string; end: string }) {
  const width = doc.page.width;
  const subtitle = `${filters.condominium || "Todos os condomínios"} · ${filters.start || "Início"} a ${filters.end || "hoje"}`;
  drawBrandBand(doc, "Indicadores para assembleia", subtitle);
  let y = 107;
  const calculated = records.map((record) => ({ record, metrics: computeMetrics(record), actual: recordedSavings(record) }));
  const actual = calculated.filter((entry) => entry.actual !== null);
  const confirmed = actual.reduce((sum, entry) => sum + (entry.actual ?? 0), 0);
  const comparable = calculated.filter((entry) => entry.metrics.isComparable);
  const potential = comparable.reduce((sum, entry) => sum + entry.metrics.savings, 0);
  const completed = records.filter((record) => record.status === "concluido").length;
  const supplierCount = calculated.reduce((sum, entry) => sum + entry.metrics.rankings.filter((row) => row.total !== null).length, 0);
  const gap = 8;
  const cardWidth = (width - 2 * MARGIN - gap * 3) / 4;
  const stats = [
    { label: "ECONOMIA CONFIRMADA", value: actual.length ? formatCurrency(confirmed) : "—", note: `${actual.length} contratação(ões) confirmada(s)` },
    { label: "ECONOMIA POTENCIAL", value: comparable.length ? formatCurrency(potential) : "—", note: `${comparable.length} comparativo(s) completo(s)` },
    { label: "MAPAS NO PERÍODO", value: String(records.length), note: `${completed} concluído(s)` },
    { label: "PROPOSTAS COM PREÇO", value: String(supplierCount), note: "fornecedores avaliados" },
  ];
  stats.forEach((stat, index) => {
    const x = MARGIN + index * (cardWidth + gap);
    const fill = index === 0 ? C.ink : C.paper;
    doc.roundedRect(x, y, cardWidth, 58, 5).fill(fill);
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(index === 0 ? "#D8D5E8" : C.muted).text(stat.label, x + 9, y + 9, { width: cardWidth - 18 });
    doc.font("Helvetica-Bold").fontSize(14).fillColor(index === 0 ? C.white : C.ink).text(stat.value, x + 9, y + 21, { width: cardWidth - 18, ellipsis: true });
    doc.font("Helvetica").fontSize(6.4).fillColor(index === 0 ? C.gold : C.muted).text(stat.note, x + 9, y + 42, { width: cardWidth - 18, ellipsis: true });
  });
  y += 72;

  const grouped = new Map<string, { potential: number; confirmed: number; count: number }>();
  for (const entry of calculated) {
    const month = entry.record.analysisDate.slice(0, 7);
    const row = grouped.get(month) ?? { potential: 0, confirmed: 0, count: 0 };
    if (entry.metrics.isComparable) row.potential += entry.metrics.savings;
    if (entry.actual !== null) row.confirmed += entry.actual;
    row.count++;
    grouped.set(month, row);
  }
  const months = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  if (months.length) {
    y = drawSectionTitle(doc, "Evolução mensal", y, width);
    const chartW = width - 2 * MARGIN - 124;
    const max = Math.max(1, ...months.flatMap(([, row]) => [row.potential, Math.abs(row.confirmed)]));
    for (const [month, row] of months) {
      if (y + 23 > doc.page.height - 50) { addNewPage(doc, "Indicadores para assembleia", "Evolução mensal — continuação"); y = doc.y; }
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.text).text(month, MARGIN, y + 5, { width: 51, lineBreak: false });
      const bx = MARGIN + 55;
      const potentialWidth = Math.max(row.potential > 0 ? 2 : 0, chartW * row.potential / max);
      const confirmedWidth = Math.max(row.confirmed !== 0 ? 2 : 0, chartW * Math.abs(row.confirmed) / max);
      doc.roundedRect(bx, y + 3, Math.min(chartW, potentialWidth), 5, 2).fill(C.gold);
      doc.roundedRect(bx, y + 11, Math.min(chartW, confirmedWidth), 5, 2).fill(C.green);
      doc.font("Helvetica").fontSize(6.5).fillColor(C.muted).text(`Potencial ${formatCurrency(row.potential)}  ·  Confirmada ${formatCurrency(row.confirmed)}`, bx, y + 18, { width: chartW + 62, lineBreak: false, ellipsis: true });
      y += 30;
    }
    y += 4;
  }

  const costs: Record<"mao_obra" | "material" | "nao_discriminado", { amount: number; count: number }> = { mao_obra: { amount: 0, count: 0 }, material: { amount: 0, count: 0 }, nao_discriminado: { amount: 0, count: 0 } };
  for (const entry of comparable) {
    if (!entry.metrics.best) continue;
    const breakdown = supplierCostBreakdown(entry.record.items, entry.metrics.best.supplier.id);
    for (const type of ["mao_obra", "material", "nao_discriminado"] as const) {
      if (breakdown[type].total !== null) { costs[type].amount += breakdown[type].total; costs[type].count++; }
    }
  }
  y = sectionWithPage(doc, y, 80, "Composição de custos", subtitle, "Indicadores para assembleia");
  y = drawSectionTitle(doc, "Composição das propostas completas", y, width);
  const costEntries = [["Mão de obra", costs.mao_obra], ["Material", costs.material], ["Não discriminado", costs.nao_discriminado]] as const;
  const costGap = 8;
  const costWidth = (width - 2 * MARGIN - costGap * 2) / 3;
  costEntries.forEach(([label, value], i) => {
    const x = MARGIN + i * (costWidth + costGap);
    doc.roundedRect(x, y, costWidth, 40, 4).fill(C.paper);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text(label.toUpperCase(), x + 8, y + 7, { width: costWidth - 16 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.ink).text(value.count ? formatCurrency(value.amount) : "—", x + 8, y + 19, { width: costWidth - 16 });
  });
  y += 50;

  const byCondo = new Map<string, { count: number; potential: number; confirmed: number }>();
  for (const entry of calculated) {
    const name = entry.record.condominium || "Não informado";
    const row = byCondo.get(name) ?? { count: 0, potential: 0, confirmed: 0 };
    row.count++;
    if (entry.metrics.isComparable) row.potential += entry.metrics.savings;
    if (entry.actual !== null) row.confirmed += entry.actual;
    byCondo.set(name, row);
  }
  y = sectionWithPage(doc, y, 50 + byCondo.size * 19, "Por condomínio", subtitle, "Indicadores para assembleia");
  y = drawSectionTitle(doc, "Resultados por condomínio", y, width);
  const condoHeader = () => {
    const widths = [width * 0.48 - MARGIN, width * 0.12, width * 0.20, width * 0.20];
    const labels = ["Condomínio / associação", "Mapas", "Potencial", "Confirmada"];
    let x = MARGIN;
    labels.forEach((label, i) => { doc.rect(x, y, widths[i], 18).fill(C.ink); doc.font("Helvetica-Bold").fontSize(6.7).fillColor(C.white).text(label, x + 5, y + 6, { width: widths[i] - 10, lineBreak: false }); x += widths[i]; });
    y += 18;
    return widths;
  };
  let condoWidths = condoHeader();
  for (const [name, value] of [...byCondo.entries()].sort((a, b) => b[1].potential - a[1].potential)) {
    if (y + 18 > doc.page.height - 50) { addNewPage(doc, "Indicadores para assembleia", "Resultados por condomínio — continuação"); y = doc.y; condoWidths = condoHeader(); }
    const values = [safeText(name), String(value.count), formatCurrency(value.potential), formatCurrency(value.confirmed)];
    let x = MARGIN;
    values.forEach((text, i) => { doc.rect(x, y, condoWidths[i], 18).fill(i % 2 ? C.white : C.paper).strokeColor(C.line).lineWidth(0.3).stroke(); doc.font("Helvetica").fontSize(7).fillColor(C.text).text(text, x + 5, y + 6, { width: condoWidths[i] - 10, align: i === 0 ? "left" : "right", lineBreak: false, ellipsis: true }); x += condoWidths[i]; });
    y += 18;
  }
  y += 7;

  const tableWidths = [190, 76, 57, 65, 82, 82, width - 2 * MARGIN - 552];
  const tableLabels = ["Condomínio", "Objeto", "Data", "Status", "Proposta completa", "Economia potencial", "Economia confirmada"];
  const drawTableHeader = () => {
    if (y + 18 > doc.page.height - 47) { addNewPage(doc, "Indicadores para assembleia", "Mapas do período — continuação"); y = doc.y; }
    let x = MARGIN;
    tableLabels.forEach((label, i) => { doc.rect(x, y, tableWidths[i], 22).fill(C.ink); doc.font("Helvetica-Bold").fontSize(6.2).fillColor(C.white).text(safeText(label), x + 3, y + 6, { width: tableWidths[i] - 6, height: 14, align: i >= 4 ? "right" : "left", ellipsis: true }); x += tableWidths[i]; });
    y += 22;
  };
  y = sectionWithPage(doc, y, 45, "Mapas do período", subtitle, "Indicadores para assembleia");
  y = drawSectionTitle(doc, "Mapas do período", y, width);
  drawTableHeader();
  for (const entry of calculated) {
    const rowH = Math.max(22, textHeight(doc, entry.record.condominium, tableWidths[0] - 8, 6.8) + 8);
    if (y + rowH > doc.page.height - 50) { addNewPage(doc, "Indicadores para assembleia", "Mapas do período — continuação"); y = doc.y; drawTableHeader(); }
    const values = [safeText(entry.record.condominium), safeText(entry.record.service || entry.record.protocol), formatDateBR(entry.record.analysisDate), entry.record.status === "concluido" ? "Concluído" : entry.record.status === "rascunho" ? "Rascunho" : "Em análise", formatCurrency(entry.metrics.best?.total ?? null), entry.metrics.isComparable ? formatCurrency(entry.metrics.savings) : "—", formatCurrency(entry.actual)];
    let x = MARGIN;
    values.forEach((text, i) => { doc.rect(x, y, tableWidths[i], rowH).fill(C.white).strokeColor(C.line).lineWidth(0.3).stroke(); doc.font("Helvetica").fontSize(6.5).fillColor(C.text).text(text, x + 3, y + 6, { width: tableWidths[i] - 6, height: rowH - 6, align: i >= 4 ? "right" : "left", ellipsis: true }); x += tableWidths[i]; });
    y += rowH;
  }
  const noteY = sectionWithPage(doc, y, 36, "Metodologia", subtitle, "Indicadores para assembleia");
  doc.font("Helvetica").fontSize(6.8).fillColor(C.muted).text("Economia potencial = diferença entre a maior e a menor proposta que cobre todos os itens. Economia confirmada = valor de referência menos valor contratado, registrado e confirmado pela equipe. Estes indicadores apoiam a apresentação e não substituem apuração contábil de lucro.", MARGIN, noteY + 3, { width: width - 2 * MARGIN, lineGap: 1.5 });
}

export async function generateQuotationPdf(record: QuotationRecord): Promise<Buffer> {
  return renderPdf(`Mapa de cotação ${record.protocol}`, (doc) => drawQuotationPdf(doc, record));
}

export async function generateIndicatorsPdf(records: QuotationRecord[], filters: { condominium: string; start: string; end: string }): Promise<Buffer> {
  return renderPdf("Indicadores de cotações Gerencial", (doc) => drawDashboardPdf(doc, records, filters));
}
