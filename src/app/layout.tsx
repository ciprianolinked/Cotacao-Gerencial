import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Gerencial · Mapa de Cotação",
  description:
    "Plataforma de governança condominial da Gerencial para elaborar, comparar e aprovar mapas de cotação com apoio de inteligência artificial gratuita.",
  icons: {
    icon: [{ url: "/api/brand/simbolo?v=2", type: "image/png", sizes: "400x400" }],
    apple: "/api/brand/simbolo?v=2",
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
