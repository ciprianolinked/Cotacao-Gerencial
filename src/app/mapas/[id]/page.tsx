import { notFound } from "next/navigation";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { QuotationEditorClient } from "@/components/QuotationEditorClient";
import {
  formatDatabaseError,
  getQuotationById,
  listCondominiums,
} from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let quotation = null;
  let condos: Awaited<ReturnType<typeof listCondominiums>> = [];
  let dbError: string | null = null;

  try {
    [quotation, condos] = await Promise.all([
      getQuotationById(id),
      listCondominiums(),
    ]);
  } catch (err) {
    console.error("QuotationDetailPage database error:", err);
    dbError = formatDatabaseError(err);
  }

  if (dbError) {
    return (
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-6 sm:px-6">
        <DbErrorBanner message={dbError} />
      </main>
    );
  }

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
