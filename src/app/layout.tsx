import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Gerencial · Mapa de Cotação",
  description:
    "Plataforma de governança condominial da Gerencial para elaborar, comparar e aprovar mapas de cotação com apoio de inteligência artificial gratuita.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/identidade/simbolo.png", type: "image/png" },
    ],
    apple: "/identidade/simbolo.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <div className="min-h-screen bg-paper">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
