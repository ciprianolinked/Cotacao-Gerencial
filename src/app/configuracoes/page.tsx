import type { Metadata } from "next";
import { AiConfigClient } from "@/components/AiConfigClient";
import { DbUnavailable } from "@/components/DbUnavailable";
import { safeLoad } from "@/lib/safe-load";
import { getAiConfig } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurar IA gratuita · Gerencial",
};

export default async function ConfiguracoesPage() {
  const { data, error } = await safeLoad(() => getAiConfig());

  if (error || !data) {
    return <DbUnavailable reason={error ?? undefined} />;
  }

  return (
    <AiConfigClient
      initialStatus={{
        configured: data.configured,
        source: data.source,
        maskedKey: data.maskedKey,
        model: data.model,
      }}
    />
  );
}
