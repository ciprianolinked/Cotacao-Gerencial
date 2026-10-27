import { NextResponse } from "next/server";
import { extractQuotation, validateUploads, type ExtractionHints, type UploadInput } from "@/lib/ai";
import { ACCEPTED_UPLOAD_TYPES, MAX_FILES, MAX_FILE_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
// Três ou mais PDFs podem levar alguns minutos no Gemini. 300 s é o máximo do plano Hobby da Vercel.
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let files: UploadInput[] = [];
    let text = "";
    let hints: ExtractionHints = {};
    const rejected: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const entries = form.getAll("files").filter((entry): entry is File => entry instanceof File);
      text = String(form.get("text") ?? "");
      const rawHints = String(form.get("hints") ?? "");
      if (rawHints) {
        try {
          hints = JSON.parse(rawHints) as ExtractionHints;
        } catch {
          hints = {};
        }
      }

      if (entries.length > MAX_FILES) rejected.push(`Apenas ${MAX_FILES} arquivos são processados por vez.`);
      const accepted: UploadInput[] = [];
      for (const file of entries.slice(0, MAX_FILES)) {
        const allowed = ACCEPTED_UPLOAD_TYPES.includes(file.type) || file.type.startsWith("image/");
        if (!allowed) {
          rejected.push(`${file.name}: formato não suportado (use PDF, JPG, PNG ou WEBP).`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          rejected.push(`${file.name}: excede 15 MB.`);
          continue;
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        accepted.push({ name: file.name, type: file.type || "application/pdf", size: file.size, base64: buffer.toString("base64") });
      }
      files = accepted;
    } else {
      const payload = (await request.json()) as {
        files?: unknown;
        text?: unknown;
        hints?: unknown;
      };
      files = validateUploads(payload.files);
      text = typeof payload.text === "string" ? payload.text : "";
      hints = (payload.hints ?? {}) as ExtractionHints;
    }

    if (files.length === 0 && !text.trim()) {
      return NextResponse.json(
        {
          error:
            rejected[0] ??
            "Envie ao menos um arquivo PDF/imagem ou cole o texto da cotação para a análise.",
        },
        { status: 400 },
      );
    }

    const extraction = await extractQuotation({ files, text, hints });
    return NextResponse.json({
      ...extraction,
      warnings: [...rejected, ...extraction.warnings],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível analisar os documentos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
