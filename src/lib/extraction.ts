import type { AiExtractionResult, AttachmentMeta, QuotationDraft } from "./types";
import { buildNarrative, uid } from "./quotation";

export function mergeExtraction(
  base: QuotationDraft,
  extraction: AiExtractionResult,
  files: { name: string; size: number; type: string }[],
): QuotationDraft {
  const extracted = extraction.draft;
  const suppliers = extracted.suppliers?.length ? extracted.suppliers : base.suppliers;
  const items = extracted.items?.length ? extracted.items : base.items;

  const analysis =
    extracted.analysis && (extracted.analysis.summary || extracted.analysis.recommendation)
      ? {
          summary: extracted.analysis.summary || base.analysis.summary,
          recommendation: extracted.analysis.recommendation || base.analysis.recommendation,
          notes: extracted.analysis.notes || base.analysis.notes,
        }
      : buildNarrative({
          items,
          suppliers,
          kind: extracted.kind ?? base.kind,
          service: extracted.service || base.service,
          condominium: extracted.condominium || base.condominium,
        });

  const source: AttachmentMeta["source"] = extraction.mode === "ia" ? "ia" : "manual";
  const analyzedAt = new Date().toISOString();
  const newAttachments: AttachmentMeta[] = files.map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type || "application/pdf",
    source,
    analyzedAt,
  }));
  const attachments = [...base.attachments.filter((file) => !newAttachments.some((incoming) => incoming.name === file.name)), ...newAttachments];

  return {
    ...base,
    condominium: base.condominium.trim() || extracted.condominium?.trim() || "",
    analysisDate: base.analysisDate || extracted.analysisDate || "",
    recipient: base.recipient.trim() || extracted.recipient?.trim() || "",
    service: base.service.trim() || extracted.service?.trim() || "",
    description: base.description.trim() || extracted.description?.trim() || "",
    kind: extracted.kind ?? base.kind,
    category: extracted.category || base.category,
    suppliers,
    items,
    analysis,
    attachments,
    protocol: base.protocol,
  };
}

export function fileToMeta(file: File) {
  return { id: uid("file_"), name: file.name, size: file.size, type: file.type || "application/pdf" };
}
