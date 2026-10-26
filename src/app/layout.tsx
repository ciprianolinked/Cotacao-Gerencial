import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gerencial · Mapa de Cotação",
  description:
    "Plataforma de governança condominial da Gerencial para elaborar, comparar e aprovar mapas de cotação com apoio de inteligência artificial gratuita.",
  icons: {
    icon: "/brand/gerencial-simbolo.png",
    apple: "/brand/gerencial-simbolo.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
