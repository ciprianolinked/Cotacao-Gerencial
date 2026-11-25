import { GERENCIAL_LOGO_DATA_URI, GERENCIAL_LOGO_HEIGHT, GERENCIAL_LOGO_WIDTH } from "@/lib/brand-assets";

export function BrandLogo({ height = 26, className = "", decorative = false }: {
  height?: number;
  className?: string;
  decorative?: boolean;
}) {
  return (
    // An embedded source keeps the exact original artwork when public/ binaries are omitted on export.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={GERENCIAL_LOGO_DATA_URI}
      alt={decorative ? "" : "Gerencial — Governança Condominial"}
      aria-hidden={decorative || undefined}
      width={GERENCIAL_LOGO_WIDTH}
      height={GERENCIAL_LOGO_HEIGHT}
      style={{ height, width: height * GERENCIAL_LOGO_WIDTH / GERENCIAL_LOGO_HEIGHT, maxWidth: "100%", objectFit: "contain" }}
      className={`block shrink-0 ${className}`}
    />
  );
}
