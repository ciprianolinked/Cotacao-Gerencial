"use client";

import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Painel", match: (p: string) => p === "/" },
  { href: "/#mapas", label: "Mapas de cotação", match: (p: string) => p.startsWith("/mapas/") && p !== "/mapas/novo" },
  { href: "/condominios", label: "Condomínios", match: (p: string) => p.startsWith("/condominios") },
  { href: "/indicadores", label: "Indicadores", match: (p: string) => p.startsWith("/indicadores") },
  { href: "/configuracoes", label: "Configurar IA", match: (p: string) => p.startsWith("/configuracoes") },
  { href: "/ajuda", label: "Ajuda", match: (p: string) => p.startsWith("/ajuda") },
];

export function SiteHeader() {
  const pathname = usePathname() || "/";

  return (
    <header className="no-print sticky top-0 z-40 bg-ink text-white shadow-[0_2px_0_0_#fab12a]">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            aria-label="Gerencial — início"
            className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <BrandLogo height={26} />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ajuda"
            className="rounded-lg px-2 py-2 text-[12px] font-semibold text-white/80 hover:bg-white/10 md:hidden"
          >
            Ajuda
          </Link>
          <Link
            href="/ajuda/ia"
            className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand transition hover:bg-white/15 lg:inline-flex"
          >
            <Sparkles className="h-3 w-3" />
            IA gratuita
          </Link>
          <Link href="/mapas/novo" className="btn btn-brand">
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            <span className="hidden sm:inline">Nova cotação</span>
            <span className="sm:hidden">Nova</span>
          </Link>
        </div>
      </div>

      <nav
        aria-label="Navegação móvel"
        className="flex gap-4 overflow-x-auto border-t border-white/10 px-4 pb-2 pt-1.5 text-[11px] font-semibold text-white/75 md:hidden"
      >
        <Link href="/" className="whitespace-nowrap hover:text-white">
          Painel
        </Link>
        <Link href="/condominios" className="whitespace-nowrap hover:text-white">
          Condomínios
        </Link>
        <Link href="/indicadores" className="whitespace-nowrap hover:text-white">
          Indicadores
        </Link>
        <Link href="/configuracoes" className="whitespace-nowrap hover:text-white">
          Configurar IA
        </Link>
      </nav>
    </header>
  );
}
