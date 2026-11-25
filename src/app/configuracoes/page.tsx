import type { Metadata } from "next";
import { AiConfigClient } from "@/components/AiConfigClient";
import { getAiConfig } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurar IA gratuita · Gerencial",
};

export default async function ConfiguracoesPage() {
  const cfg = await getAiConfig();
  return (
    <AiConfigClient
      initialStatus={{
        configured: cfg.configured,
        source: cfg.source,
        maskedKey: cfg.maskedKey,
        model: cfg.model,
      }}
    />
  );
}
