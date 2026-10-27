"use client";

function parseFilename(disposition: string | null, fallback: string): string {
  const utf8 = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try { return decodeURIComponent(utf8.replace(/^"|"$/g, "")); } catch { /* fallback abaixo */ }
  }
  const quoted = disposition?.match(/filename="([^"]+)"/i)?.[1];
  return quoted || fallback;
}

export async function downloadPdf(url: string, fallbackName: string): Promise<string> {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    let message = "Não foi possível gerar o PDF. Tente novamente.";
    try {
      const data = await response.json() as { error?: string };
      if (data.error) message = data.error;
    } catch {
      if (response.status === 404) message = "O documento solicitado não foi encontrado.";
    }
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/pdf")) {
    throw new Error("O servidor não devolveu um arquivo PDF válido.");
  }
  const blob = await response.blob();
  if (blob.size < 8) throw new Error("O PDF gerado está vazio. Confira o documento e tente novamente.");

  const fileName = parseFilename(response.headers.get("content-disposition"), fallbackName);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  return fileName;
}
