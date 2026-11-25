import { notFound } from "next/navigation";
import { QuotationEditorClient } from "@/components/QuotationEditorClient";
import { DbUnavailable } from "@/components/DbUnavailable";
import { safeLoad } from "@/lib/safe-load";
import { getQuotationById, listCondominiums } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [quotation, condosRes] = await Promise.all([
    safeLoad(() => getQuotationById(id)),
    safeLoad(() => listCondominiums()),
  ]);

  const error = quotation.error || condosRes.error;

  if (error) {
    return <DbUnavailable reason={error} />;
  }

  if (!quotation.data) {
    notFound();
  }

  const item = quotation.data;

  return (
    <QuotationEditorClient
      quotationId={item.id}
      protocol={item.protocol}
      initial={{
        status: item.status,
        condominium: item.condominium,
        analysisDate: item.analysisDate,
        recipient: item.recipient,
        service: item.service,
        description: item.description,
        kind: item.kind,
        category: item.category,
        suppliers: item.suppliers,
        items: item.items,
        analysis: item.analysis,
        attachments: item.attachments,
      }}
      condominiums={(condosRes.data ?? []).map((c) => c.name)}
    />
  );
}
