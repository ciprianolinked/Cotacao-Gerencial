"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  SearchCode,
  Trash2,
} from "lucide-react";
import { normalizeText } from "@/lib/calculations";
import { safeJson } from "@/lib/http";
import type { CondominiumRecord } from "@/lib/types";

function formatCnpjDisplay(digits: string | null | undefined): string {
  const d = (digits ?? "").replace(/\D/g, "").slice(0, 14);
  const m = d.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
  if (!m) return d;
  return `${m[1]}.${m[2]}.${m[3]}/${m[4]}-${m[5]}`;
}

function maskCnpjInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 8);
  const p4 = d.slice(8, 12);
  const p5 = d.slice(12, 14);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `/${p4}`;
  if (p5) out += `-${p5}`;
  return out;
}

interface CondominiumsClientProps {
  initial: CondominiumRecord[];
}

export function CondominiumsClient({ initial }: CondominiumsClientProps) {
  const [list, setList] = useState<CondominiumRecord[]>(initial);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"idle" | "create" | "edit">("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [cnpj, setCnpj] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [manager, setManager] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [cnpjInfo, setCnpjInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return list;
    const qDigits = search.replace(/\D/g, "");
    return list.filter((c) => {
      if (normalizeText(c.name).includes(q)) return true;
      if (normalizeText(c.city || "").includes(q)) return true;
      if (normalizeText(c.manager || "").includes(q)) return true;
      if (normalizeText(c.contactEmail || "").includes(q)) return true;
      if (qDigits && c.cnpj && c.cnpj.includes(qDigits)) return true;
      if (qDigits && (c.contactPhone ?? "").replace(/\D/g, "").includes(qDigits))
        return true;
      return false;
    });
  }, [list, search]);

  function resetFormFields() {
    setCnpj("");
    setName("");
    setCity("");
    setManager("");
    setContactEmail("");
    setContactPhone("");
    setCnpjInfo(null);
  }

  function startCreate() {
    setMode("create");
    setSelectedId(null);
    resetFormFields();
    setMessage(null);
  }

  function startEdit(c: CondominiumRecord) {
    setMode("edit");
    setSelectedId(c.id);
    setCnpj(formatCnpjDisplay(c.cnpj));
    setName(c.name);
    setCity(c.city || "");
    setManager(c.manager || "");
    setContactEmail(c.contactEmail || "");
    setContactPhone(c.contactPhone || "");
    setCnpjInfo(null);
    setMessage(null);
  }

  async function handleCnpjLookup() {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      setMessage({
        type: "error",
        text: "Informe o CNPJ completo com 14 dígitos para buscar os dados.",
      });
      return;
    }

    setFetchingCnpj(true);
    setMessage(null);
    setCnpjInfo(null);
    try {
      const res = await fetch(`/api/cnpj/${digits}`);
      const json = await safeJson<{ error?: string; company?: Record<string, string> }>(res);
      if (!res.ok) {
        throw new Error(json.error || "CNPJ não encontrado.");
      }

      const company = json.company as {
        name: string;
        legalName: string;
        city: string;
        email: string;
        phone: string;
        manager: string;
        status: string;
      };

      if (company.name) setName(company.name);
      if (company.city) setCity(company.city);
      if (company.email) setContactEmail(company.email);
      if (company.phone) setContactPhone(company.phone);
      if (company.manager && !manager.trim()) setManager(company.manager);

      setCnpjInfo(
        `Dados carregados da Receita Federal (${
          company.status || "situação cadastral consultada"
        }). Razão social: ${company.legalName || company.name}.`
      );
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Não foi possível consultar o CNPJ.",
      });
    } finally {
      setFetchingCnpj(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({
        type: "error",
        text: "Informe o nome do condomínio ou associação.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        name,
        cnpj,
        city,
        manager,
        contactEmail,
        contactPhone,
      };
      if (mode === "create") {
        const res = await fetch("/api/condominiums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await safeJson<{
          error?: string;
          condominium?: CondominiumRecord;
        }>(res);
        if (!res.ok || !json.condominium) {
          throw new Error(json.error || "Erro ao cadastrar.");
        }
        setList((prev) =>
          [...prev, json.condominium!].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
        startEdit(json.condominium);
        setMessage({
          type: "success",
          text: "Condomínio cadastrado com sucesso.",
        });
      } else if (mode === "edit" && selectedId) {
        const res = await fetch(`/api/condominiums/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await safeJson<{
          error?: string;
          condominium?: CondominiumRecord;
        }>(res);
        if (!res.ok || !json.condominium) {
          throw new Error(json.error || "Erro ao atualizar.");
        }
        const updated = json.condominium;
        setList((prev) =>
          prev
            .map((c) =>
              c.id === selectedId
                ? {
                    ...c,
                    name: updated.name,
                    cnpj: updated.cnpj,
                    city: updated.city,
                    manager: updated.manager,
                    contactEmail: updated.contactEmail,
                    contactPhone: updated.contactPhone,
                  }
                : c
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setMessage({
          type: "success",
          text: "Cadastro atualizado com sucesso.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao salvar cadastro.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: CondominiumRecord) {
    if (
      !window.confirm(
        `Remover o cadastro "${c.name}" da lista? (Os mapas já salvos não serão apagados.)`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/condominiums/${c.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao remover.");
      setList((prev) => prev.filter((item) => item.id !== c.id));
      if (selectedId === c.id) {
        setMode("idle");
        setSelectedId(null);
      }
      setMessage({ type: "success", text: "Cadastro removido." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao remover.",
      });
    }
  }

  const selectedRecord = list.find((c) => c.id === selectedId) ?? null;

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao painel
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-dark">
            Base de clientes
          </p>
          <h1 className="font-display mt-1 text-[30px] leading-tight text-ink sm:text-[34px]">
            Condomínios e associações
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Consulte os cadastros, preencha os dados automaticamente pelo CNPJ e
            acompanhe os mapas de cada condomínio.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="btn btn-brand"
        >
          <Plus className="h-4 w-4" />
          Cadastrar condomínio
        </button>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_370px]">
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[14px] font-extrabold text-ink">
                Condomínios cadastrados
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {list.length} cadastro(s) na base Gerencial
              </p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field w-full !py-2 pl-9 text-[12px] sm:w-64"
                placeholder="Buscar condomínio, síndico ou CNPJ"
                aria-label="Buscar condomínios"
              />
            </div>
          </div>

          <ul className="divide-y divide-line">
            {filtered.map((c) => {
              const isSelected = selectedId === c.id && mode === "edit";
              const subtitle =
                c.city || c.manager
                  ? [c.city, c.manager].filter(Boolean).join(" · ")
                  : "Cidade e responsável não informados";

              return (
                <li
                  key={c.id}
                  className={`flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-paper/60 ${
                    isSelected ? "bg-brand-soft/40" : ""
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-brand">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-[180px] flex-1">
                    <p className="text-[13px] font-extrabold text-ink">
                      {c.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {subtitle}
                      {c.contactEmail ? ` · ${c.contactEmail}` : ""}
                      {c.contactPhone ? ` · ${c.contactPhone}` : ""}
                    </p>
                    {c.cnpj && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-paper px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-slate-500">
                        CNPJ {formatCnpjDisplay(c.cnpj)}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-paper px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    {c.mapCount} mapa(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="btn btn-ghost !px-3 !py-1.5"
                  >
                    Editar
                    <Pencil className="h-3 w-3" />
                  </button>
                </li>
              );
            })}

            {filtered.length === 0 && (
              <li className="px-5 py-10 text-center text-[12.5px] text-slate-500">
                Nenhum condomínio encontrado para essa busca.
              </li>
            )}
          </ul>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <section className="card overflow-hidden">
            <div className="border-b border-line bg-paper/60 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-dark">
                {mode === "create"
                  ? "Novo cadastro"
                  : mode === "edit"
                  ? "Editar cadastro"
                  : "Cadastro"}
              </p>
              <h2 className="mt-1 text-[15px] font-extrabold text-ink">
                Dados do condomínio
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {mode === "idle"
                  ? "Selecione um cadastro na lista para visualizar ou editar."
                  : "Esses dados ficam disponíveis no preenchimento rápido de novos mapas."}
              </p>
            </div>

            {mode === "idle" ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[12px] leading-relaxed text-slate-500">
                  Clique em <strong>Editar</strong> em um condomínio ou adicione
                  um novo cadastro.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
                {message && (
                  <p
                    className={`rounded-lg px-3 py-2 text-[11.5px] font-semibold ${
                      message.type === "error"
                        ? "bg-red-50 text-red-700"
                        : "bg-success-soft text-success"
                    }`}
                  >
                    {message.text}
                  </p>
                )}

                <div>
                  <label htmlFor="cnpj-input">
                    <span className="label">CNPJ do condomínio</span>
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id="cnpj-input"
                      value={cnpj}
                      onChange={(e) => {
                        setCnpj(maskCnpjInput(e.target.value));
                        setCnpjInfo(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCnpjLookup();
                        }
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="00.000.000/0001-91"
                      className="field font-mono !text-[12px]"
                      aria-describedby="cnpj-help"
                    />
                    <button
                      type="button"
                      disabled={fetchingCnpj}
                      onClick={handleCnpjLookup}
                      className="btn btn-brand shrink-0 !px-3"
                      title="Buscar dados automaticamente na Receita Federal"
                    >
                      {fetchingCnpj ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SearchCode className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {fetchingCnpj ? "Buscando…" : "Buscar dados"}
                      </span>
                    </button>
                  </div>
                  <p id="cnpj-help" className="mt-1 text-[10px] leading-snug text-slate-500">
                    Preenche automaticamente nome, cidade/UF, e-mail, telefone e
                    síndico (quando informado) a partir da base pública da
                    Receita Federal.
                  </p>
                  {cnpjInfo && (
                    <p className="mt-1.5 rounded-lg border border-brand/40 bg-brand-soft px-2.5 py-1.5 text-[10.5px] leading-snug text-brand-dark">
                      {cnpjInfo}
                    </p>
                  )}
                </div>

                <label className="block">
                  <span className="label">Nome do condomínio / associação *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field mt-1"
                    placeholder="Ex.: Residencial Alto da Colina"
                    required
                  />
                </label>

                <label className="block">
                  <span className="label">Cidade / UF</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="field mt-1"
                    placeholder="Ex.: São José dos Campos / SP"
                  />
                </label>

                <label className="block">
                  <span className="label">Síndico(a) / Responsável</span>
                  <input
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className="field mt-1"
                    placeholder="Nome do responsável"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">E-mail de contato</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="field mt-1"
                      placeholder="atendimento@gerencialcond.com.br"
                    />
                  </label>
                  <label className="block">
                    <span className="label">Telefone / WhatsApp</span>
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="field mt-1"
                      placeholder="(12) 3456-7890"
                      inputMode="tel"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary flex-1"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {mode === "create" ? "Cadastrar" : "Salvar alterações"}
                  </button>
                  {mode === "edit" && selectedRecord && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedRecord)}
                      className="btn text-red-600 hover:bg-red-50"
                      title="Remover cadastro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>

          <Link
            href="/indicadores"
            className="card group flex items-center justify-between gap-3 px-4 py-3.5 transition hover:border-brand"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-brand">
                <BarChart3 className="h-4 w-4" />
              </span>
              <span>
                <strong className="block text-[12.5px] text-ink">
                  Ver indicadores por local
                </strong>
                <span className="block text-[11px] text-slate-500">
                  Economia consolidada por condomínio
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-ink" />
          </Link>
        </aside>
      </div>
    </main>
  );
}
