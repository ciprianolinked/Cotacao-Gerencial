"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CondominiumRecord } from "@/lib/types";
import { formatCompactCurrency } from "@/lib/quotation";
import { ArrowRightIcon, BuildingIcon, CheckIcon, CloseIcon, PlusIcon, SearchIcon, TrashIcon } from "./icons";

export type CondominiumStats = {
  name: string;
  quotations: number;
  savings: number;
  lastDate: string | null;
};

type Props = {
  initial: CondominiumRecord[];
  stats: CondominiumStats[];
};

type Draft = { name: string; city: string; manager: string };
type Feedback = { tone: "ok" | "error"; message: string } | null;

const EMPTY: Draft = { name: "", city: "", manager: "" };

export function CondominiumsManager({ initial, stats }: Props) {
  const [list, setList] = useState(initial);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const statsByName = useMemo(() => new Map(stats.map((item) => [item.name, item])), [stats]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter((item) =>
      [item.name, item.city ?? "", item.manager ?? ""].some((value) => value.toLowerCase().includes(term)),
    );
  }, [list, query]);

  async function refresh() {
    const response = await fetch("/api/condominios");
    const data = (await response.json()) as { condominiums?: CondominiumRecord[] };
    if (data.condominiums) setList(data.condominiums);
  }

  async function save(id: string) {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/condominios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
      await refresh();
      setEditingId(null);
      setFeedback({ tone: "ok", message: "Condomínio atualizado. Os mapas antigos seguem o novo nome." });
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Erro ao salvar." });
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/condominios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar.");
      await refresh();
      setCreating(false);
      setNewDraft(EMPTY);
      setFeedback({ tone: "ok", message: "Condomínio cadastrado com sucesso." });
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Erro ao cadastrar." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/condominios/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string; quotationCount?: number };
      if (!response.ok) throw new Error(data.error || "Não foi possível excluir.");
      await refresh();
      setConfirmId(null);
      setFeedback({
        tone: "ok",
        message: data.quotationCount
          ? `Cadastro removido. Os ${data.quotationCount} mapa(s) já emitidos continuam guardados.`
          : "Cadastro removido.",
      });
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Erro ao excluir." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, cidade ou síndico"
            aria-label="Buscar condomínio"
            className="field !py-1.5 pl-8 text-[12.5px]"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating((value) => !value);
            setNewDraft(EMPTY);
          }}
          className="btn btn-brand"
        >
          <PlusIcon className="h-4 w-4" />
          Novo condomínio
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-[12.5px] font-semibold ${
            feedback.tone === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {creating && (
        <section className="card border-brand/40 px-4 py-4 sm:px-5">
          <h2 className="text-[14px] font-extrabold text-ink">Cadastrar condomínio</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label>
              <span className="label">Nome *</span>
              <input
                className="field mt-1"
                value={newDraft.name}
                onChange={(event) => setNewDraft({ ...newDraft, name: event.target.value })}
                placeholder="Condomínio Residencial ..."
              />
            </label>
            <label>
              <span className="label">Cidade / UF</span>
              <input
                className="field mt-1"
                value={newDraft.city}
                onChange={(event) => setNewDraft({ ...newDraft, city: event.target.value })}
                placeholder="São José dos Campos/SP"
              />
            </label>
            <label>
              <span className="label">Síndico(a) responsável</span>
              <input
                className="field mt-1"
                value={newDraft.manager}
                onChange={(event) => setNewDraft({ ...newDraft, manager: event.target.value })}
                placeholder="Nome do síndico"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={create} disabled={busy} className="btn btn-primary">
              <CheckIcon className="h-4 w-4" />
              {busy ? "Salvando…" : "Cadastrar"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="btn btn-ghost">
              Cancelar
            </button>
          </div>
        </section>
      )}

      {filtered.length === 0 ? (
        <section className="card px-5 py-10 text-center">
          <BuildingIcon className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-[13px] font-bold text-ink">
            {list.length === 0 ? "Nenhum condomínio cadastrado ainda" : "Nenhum resultado para esta busca"}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            {list.length === 0
              ? "Cadastre aqui ou salve uma cotação: o condomínio é registrado automaticamente."
              : "Ajuste o termo buscado e tente novamente."}
          </p>
        </section>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const data = statsByName.get(item.name);
            const isEditing = editingId === item.id;
            return (
              <li key={item.id} className="card px-4 py-4 sm:px-5">
                {isEditing ? (
                  <div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label>
                        <span className="label">Nome *</span>
                        <input
                          className="field mt-1"
                          value={draft.name}
                          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                        />
                      </label>
                      <label>
                        <span className="label">Cidade / UF</span>
                        <input
                          className="field mt-1"
                          value={draft.city}
                          onChange={(event) => setDraft({ ...draft, city: event.target.value })}
                        />
                      </label>
                      <label>
                        <span className="label">Síndico(a) responsável</span>
                        <input
                          className="field mt-1"
                          value={draft.manager}
                          onChange={(event) => setDraft({ ...draft, manager: event.target.value })}
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Ao mudar o nome, os mapas já emitidos deste condomínio passam a usar o nome novo.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => save(item.id)} disabled={busy} className="btn btn-primary">
                        <CheckIcon className="h-4 w-4" />
                        {busy ? "Salvando…" : "Salvar"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn btn-ghost">
                        <CloseIcon className="h-3.5 w-3.5" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-brand">
                        <BuildingIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-extrabold text-ink">{item.name}</p>
                        <p className="mt-0.5 text-[11.5px] text-slate-500">
                          {item.city || "Cidade não informada"}
                          {item.manager ? ` · ${item.manager}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="font-semibold text-ink">{data?.quotations ?? 0} mapa(s)</span>
                          {Boolean(data?.savings) && (
                            <span className="font-semibold text-success">
                              {formatCompactCurrency(data?.savings ?? 0)} economizados
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/?busca=${encodeURIComponent(item.name)}#mapas`} className="btn btn-ghost !py-1.5">
                        Ver mapas
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost !py-1.5"
                        onClick={() => {
                          setEditingId(item.id);
                          setDraft({ name: item.name, city: item.city ?? "", manager: item.manager ?? "" });
                          setFeedback(null);
                        }}
                      >
                        Editar
                      </button>
                      {confirmId === item.id ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1">
                          <button
                            type="button"
                            onClick={() => remove(item.id)}
                            disabled={busy}
                            className="text-[11.5px] font-bold text-red-700 underline"
                          >
                            Confirmar exclusão
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className="text-[11.5px] font-semibold text-slate-500"
                          >
                            não
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(item.id)}
                          aria-label={`Excluir ${item.name}`}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
