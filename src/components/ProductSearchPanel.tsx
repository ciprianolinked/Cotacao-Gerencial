"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Plus, Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { TRUSTED_STORES, type ProductSearchResult } from "@/lib/types";

interface ProductSearchPanelProps {
  condominium: string;
  onAddItem: (result: ProductSearchResult) => void;
}

export function ProductSearchPanel({
  condominium,
  onAddItem,
}: ProductSearchPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductSearchResult[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const items = input
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .slice(0, 8);

    if (items.length === 0) {
      setError(
        "Digite o nome do produto (marca e modelo ajudam a encontrar o link certo)."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setWarnings([]);
    setResults(null);

    try {
      const res = await fetch("/api/ai/product-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, condominium }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível pesquisar.");
      }
      setResults(data.results ?? []);
      setWarnings(data.warnings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na pesquisa online.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-2.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-ghost !py-1.5"
        >
          <Search className="h-3.5 w-3.5" />
          Buscar produto online (sem anexo)
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2.5 rounded-xl border border-line bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-extrabold text-ink">
            Buscar produto online
          </p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
            Digite um produto por linha. A busca usa o Google e prioriza{" "}
            {TRUSTED_STORES.length} lojas conhecidas — sem precisar anexar
            arquivos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-slate-400 hover:bg-paper hover:text-ink"
          aria-label="Fechar busca online"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder={
            "Ex.: Luminária Solar Integrada Intelbras LSI 4800\nTubo PVC soldável 25 mm"
          }
          className="field flex-1 resize-y text-[12px]"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="btn btn-brand self-start"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando…
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5" />
              Pesquisar
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
          {error}
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-[10.5px] text-amber-800">
          {warnings.map((w, i) => (
            <li key={i} className="rounded-md bg-amber-50 px-2.5 py-1">
              {w}
            </li>
          ))}
        </ul>
      )}

      {results && results.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
          {results.map((r, idx) => (
            <li
              key={`${r.url}-${idx}`}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[11px]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-ink">{r.title}</span>
                  {r.verified && (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-bold uppercase text-success">
                      Loja confiável
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <span>{r.store}</span>
                  {r.price !== null && (
                    <strong className="text-ink">
                      {formatCurrency(r.price)}
                    </strong>
                  )}
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-bold text-brand-dark underline"
                  >
                    Ver anúncio <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddItem(r)}
                className="btn btn-ghost !px-2.5 !py-1 text-[11px]"
              >
                <Plus className="h-3 w-3" />
                Adicionar ao mapa
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
