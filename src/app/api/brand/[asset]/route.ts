import { GERENCIAL_LOGO_DATA_URI, GERENCIAL_SYMBOL_DATA_URI } from "@/lib/brand-assets";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  const data = asset === "logo" ? GERENCIAL_LOGO_DATA_URI : asset === "simbolo" ? GERENCIAL_SYMBOL_DATA_URI : null;
  if (!data) return Response.json({ error: "Imagem não encontrada." }, { status: 404 });
  return new Response(Buffer.from(data.split(",")[1], "base64"), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
