import type { Metadata } from "next";
import { AiConfigClient } from "@/components/AiConfigClient";
import { DbErrorBanner } from "@/components/DbErrorBanner";
import { isDatabaseConfigured } from "@/db";
import {
  DEFAULT_GEMINI_MODEL,
  formatDatabaseError,
  getAiConfig,
} from "@/lib/server-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurar IA gratuita · Gerencial",
};

export default async function ConfiguracoesPage() {
  let dbError: string | null = null;
  if (!isDatabaseConfigured()) {
    dbError = formatDatabaseError(null);
  }

  const cfg = await getAiConfig().catch((err) => {
    dbError = formatDatabaseError(err);
    return {
      configured: false,
      source: "none" as const,
      maskedKey: null,
      model: DEFAULT_GEMINI_MODEL,
    };
  });

  return (
    <>
      {dbError && <DbErrorBanner message={dbError} />}
      <AiConfigClient
        initialStatus={{
          configured: cfg.configured,
          source: cfg.source,
          maskedKey: cfg.maskedKey,
          model: cfg.model,
        }}
      />
    </>
  );
}
