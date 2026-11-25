import { notFound } from "next/navigation";
import { QuotationEditorClient } from "@/components/QuotationEditorClient";
import { getQuotationById, listCondominiums } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quotation, condos] = await Promise.all([
    getQuotationById(id),
    listCondominiums(),
  ]);

  if (!quotation) {
    notFound();
  }

  return (
    <QuotationEditorClient
      quotationId={quotation.id}
      protocol={quotation.protocol}
      initial={{
        status: quotation.status,
        condominium: quotation.condominium,
        analysisDate: quotation.analysisDate,
        recipient: quotation.recipient,
        service: quotation.service,
        description: quotation.description,
        kind: quotation.kind,
        category: quotation.category,
        suppliers: quotation.suppliers,
        items: quotation.items,
        analysis: quotation.analysis,
        attachments: quotation.attachments,
      }}
      condominiums={condos.map((c) => c.name)}
    />
  );
}
