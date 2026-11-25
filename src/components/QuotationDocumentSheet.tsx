"use client";

import {
  computeSummary,
  formatCurrency,
  formatDateBR,
  itemTotal,
  lowestPriceForItem,
  recordedSavings,
  supplierCostBreakdown,
} from "@/lib/calculations";
import { COST_TYPE_LABEL, type CostType, type QuotationData } from "@/lib/types";

interface QuotationDocumentSheetProps {
  data: QuotationData;
  protocol: string;
  generatedDate?: string;
}

export function QuotationDocumentSheet({
  data,
  protocol,
  generatedDate,
}: QuotationDocumentSheetProps) {
  const summary = computeSummary(data);
  const suppliers = data.suppliers;
  const filledItems = data.items.filter(
    (it) =>
      it.description.trim().length > 0 ||
      Object.values(it.prices).some((v) => v !== null && v !== undefined)
  );
  const items = filledItems.length > 0 ? filledItems : data.items.slice(0, 1);
  const hasAnyPrice = suppliers.some(
    (s) =>
      s.name.trim() &&
      summary.rankings.some((r) => r.supplier.id === s.id && r.total !== null)
  );
  const genDate = generatedDate ?? formatDateBR(data.analysisDate);
  const confirmedDiff = recordedSavings(data);

  return (
    <article className="doc-sheet">
      <div className="doc-band">
        <div className="flex items-start justify-between gap-6">
          <div>
            <img
              src="/identidade/logo.png"
              alt="Gerencial — Governança Condominial"
              style={{ height: 28 }}
              className="w-auto max-w-full"
            />
            <p className="mt-2 max-w-[260px] text-[9px] leading-snug text-white/60">
              Administração, governança e apoio à decisão em condomínios e
              associações.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-brand">
              Documento de governança
            </p>
            <h1 className="font-display mt-1 text-[26px] leading-none text-white">
              Mapa de Cotação
            </h1>
            <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/60">
              Processo comparativo de propostas
            </p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-ink-deep">
              Protocolo {protocol}
            </div>
          </div>
        </div>
      </div>

      <div className="doc-rule" />

      <div className="doc-body">
        <section className="mt-3.5 grid grid-cols-12 gap-x-4 gap-y-2.5 border-l-[3px] border-ink bg-[#faf8f1] px-3.5 py-3">
          <div className="col-span-7">
            <p className="label !text-[8px]">Condomínio / Associação</p>
            <p className="mt-0.5 text-[12px] font-extrabold leading-snug text-ink">
              {data.condominium || "—"}
            </p>
          </div>
          <div className="col-span-3">
            <p className="label !text-[8px]">Data análise</p>
            <p className="mt-0.5 text-[12px] font-extrabold leading-snug text-ink">
              {formatDateBR(data.analysisDate)}
            </p>
          </div>
          <div className="col-span-2 text-right">
            <p className="label !text-[8px]">Natureza</p>
            <p className="mt-0.5 text-[10.5px] font-bold leading-snug text-ink">
              {data.kind === "produtos" ? "Produtos" : "Serviço"}
            </p>
            <p className="text-[8.5px] leading-snug text-slate-500">
              {data.category}
            </p>
          </div>
          <div className="col-span-5">
            <p className="label !text-[8px]">A/C</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-ink">
              {data.recipient || "—"}
            </p>
          </div>
          <div className="col-span-7">
            <p className="label !text-[8px]">Serviço / Objeto</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-ink">
              {data.service || "—"}
            </p>
          </div>
          <div className="col-span-12 border-t border-line/80 pt-2">
            <p className="label !text-[8px]">Descrição</p>
            <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-[#33333f]">
              {data.description ||
                "Descreva o escopo, a necessidade do condomínio e as premissas desta cotação."}
            </p>
          </div>
        </section>

        <section>
          <div className="doc-section-title">
            <span>1 · Mapa comparativo de propostas</span>
            <span className="text-[8.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Menor preço destacado · valores em R$
            </span>
          </div>

          <table className="doc-table">
            <thead>
              <tr>
                <th className="w-[26px]">#</th>
                <th>Descrição do item / escopo</th>
                <th className="w-[42px] text-center">Qtd</th>
                <th className="w-[46px]">Un.</th>
                {suppliers.map((sup) => (
                  <th key={sup.id} className="num w-[92px]">
                    {sup.name.trim() || "Fornecedor"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lowest = lowestPriceForItem(item, suppliers);
                return (
                  <tr key={item.id}>
                    <td className="text-slate-500">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="font-medium">
                      {item.description || "Item sem descrição"}
                      <div className="text-[8px] font-semibold text-slate-500">
                        {COST_TYPE_LABEL[item.costType ?? "nao_discriminado"]}
                      </div>
                      {item.purchaseUrl && (
                        <div className="text-[8px] text-brand-dark">
                          Link de compra
                          {item.purchaseStore ? ` (${item.purchaseStore})` : ""}
                          {item.purchasePrice != null
                            ? ` · ${formatCurrency(item.purchasePrice)}`
                            : ""}
                          {item.purchaseVerified ? " · loja confiável" : ""}
                        </div>
                      )}
                    </td>
                    <td className="num text-center">{item.quantity || "—"}</td>
                    <td className="text-slate-600">{item.unit}</td>
                    {suppliers.map((sup) => {
                      const price = item.prices?.[sup.id] ?? null;
                      const isLowest =
                        price !== null &&
                        lowest !== null &&
                        Math.abs(price - lowest) < 0.005;
                      return (
                        <td
                          key={sup.id}
                          className={`num ${isLowest ? "doc-best-cell" : ""}`}
                        >
                          {formatCurrency(price)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              <tr>
                <td
                  colSpan={4}
                  className="!bg-ink text-right text-[9px] font-bold uppercase tracking-[0.12em] !text-white"
                >
                  Total geral da proposta
                </td>
                {suppliers.map((sup) => {
                  let total = 0;
                  let count = 0;
                  for (const it of items) {
                    const t = itemTotal(it, sup.id);
                    if (t !== null) {
                      total += t;
                      count += 1;
                    }
                  }
                  const finalTot =
                    count > 0 ? Math.round(total * 100) / 100 : null;
                  const isBest = summary.best?.supplier.id === sup.id;
                  return (
                    <td
                      key={sup.id}
                      className={`num !border-b-0 text-[11px] font-extrabold ${
                        isBest
                          ? "!bg-success-soft !text-success"
                          : "!bg-[#f1eee2] text-ink"
                      }`}
                    >
                      {formatCurrency(finalTot)}
                    </td>
                  );
                })}
              </tr>

              {(["mao_obra", "material", "nao_discriminado"] as CostType[]).map(
                (ct) => (
                  <tr key={ct}>
                    <td
                      colSpan={4}
                      className="text-right text-[9px] font-bold text-slate-600"
                    >
                      {COST_TYPE_LABEL[ct]}
                    </td>
                    {suppliers.map((sup) => (
                      <td key={sup.id} className="num text-slate-600">
                        {formatCurrency(
                          supplierCostBreakdown(items, sup.id)[ct].total
                        )}
                      </td>
                    ))}
                  </tr>
                )
              )}
            </tbody>
          </table>

          <p className="mt-1 text-[8.5px] text-slate-500">
            Valores globais sem separação são apresentados como não
            discriminados; não se presume a divisão entre mão de obra e
            material.
          </p>

          {!hasAnyPrice && (
            <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[9px] font-semibold text-amber-700">
              Aguardando o preenchimento dos valores unitários por fornecedor
              para conclusão do comparativo.
            </p>
          )}
        </section>

        <section>
          <div className="doc-section-title">
            <span>2 · Condições comerciais e cobertura</span>
            <span className="text-[8.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {summary.supplierCount} fornecedor(es) consultado(s)
            </span>
          </div>

          <table className="doc-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th className="num w-[82px]">Proposta</th>
                <th className="num w-[60px]">Cobertura</th>
                <th className="w-[88px]">Entrega / execução</th>
                <th className="w-[80px]">Pagamento</th>
                <th className="w-[66px]">Validade</th>
                <th className="w-[92px]">Contato</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup) => {
                const ranking = summary.rankings.find(
                  (r) => r.supplier.id === sup.id
                );
                return (
                  <tr key={sup.id}>
                    <td>
                      <span className="font-bold text-ink">
                        {sup.name.trim() || "Fornecedor"}
                      </span>
                      {ranking?.isBest && summary.isComparable && (
                        <span className="ml-1.5 rounded-sm bg-success-soft px-1.5 py-[1px] text-[7.5px] font-extrabold uppercase tracking-[0.08em] text-success">
                          Menor valor
                        </span>
                      )}
                      {sup.notes && (
                        <div className="text-[8.5px] text-slate-500">
                          {sup.notes}
                        </div>
                      )}
                    </td>
                    <td
                      className={`num font-bold ${
                        ranking?.isBest ? "text-success" : "text-ink"
                      }`}
                    >
                      {formatCurrency(ranking?.total ?? null)}
                    </td>
                    <td className="num text-slate-600">
                      {ranking ? `${ranking.coverage}/${items.length}` : "—"}
                    </td>
                    <td className="text-slate-600">
                      {sup.deliveryDays || "—"}
                    </td>
                    <td className="text-slate-600">
                      {sup.paymentTerms || "—"}
                    </td>
                    <td className="text-slate-600">{sup.validity || "—"}</td>
                    <td className="text-[8.5px] text-slate-600">
                      {sup.contact || "—"}
                      {sup.purchaseUrl && (
                        <div className="mt-0.5 break-all text-[8px] text-brand-dark">
                          Loja: {sup.purchaseUrl}
                          {sup.purchaseVerified ? " (confiável)" : ""}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="grid grid-cols-12 gap-3">
          <div className="col-span-8">
            <div className="doc-section-title">
              <span>3 · Análise técnica e recomendação</span>
            </div>
            <div className="rounded-md border border-line bg-white px-3 py-2.5">
              <p className="label !text-[8px]">Parecer da governança</p>
              <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-[#33333f]">
                {data.analysis.summary ||
                  "A análise técnica é gerada automaticamente a partir das propostas inseridas, comparando cobertura, preço global e condições comerciais."}
              </p>
              <p className="mt-2 whitespace-pre-line border-t border-dashed border-line pt-2 text-[10px] font-semibold leading-relaxed text-ink">
                {data.analysis.recommendation ||
                  "Recomendação pendente de análise."}
              </p>
            </div>
          </div>

          <div className="col-span-4">
            <div className="doc-section-title">
              <span>Indicadores</span>
            </div>
            <div className="rounded-md border border-line bg-[#faf8f1] px-3 py-2.5">
              <p className="label !text-[8px]">Melhor proposta</p>
              <p className="text-[11px] font-extrabold leading-tight text-ink">
                {summary.best?.supplier.name || "—"}
              </p>
              <p className="mt-0.5 text-[15px] font-extrabold leading-none text-success">
                {formatCurrency(summary.best?.total ?? null)}
              </p>
              <div className="mt-2 border-t border-line pt-2">
                <p className="label !text-[8px]">Economia potencial</p>
                <p className="text-[13px] font-extrabold leading-none text-ink">
                  {formatCurrency(summary.savings)}
                </p>
                {summary.savings > 0 && (
                  <p className="mt-0.5 text-[8.5px] font-semibold text-slate-500">
                    {summary.savingsPercent.toFixed(1)}% frente à maior proposta
                  </p>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[8.5px] font-semibold text-slate-500">
                <span>{items.length} item(ns)</span>
                <span>{suppliers.length} proposta(s)</span>
              </div>
            </div>
          </div>
        </section>

        {confirmedDiff !== null && data.analysis.outcome && (
          <section className="mt-3 rounded-md border border-line bg-[#faf8f1] px-3 py-2">
            <p className="label !text-[8px]">
              Resultado confirmado da contratação
            </p>
            <p className="mt-1 text-[10px] text-ink">
              Fornecedor:{" "}
              <strong>
                {data.suppliers.find(
                  (s) => s.id === data.analysis.outcome.supplierId
                )?.name || "—"}
              </strong>{" "}
              · Referência:{" "}
              <strong>
                {formatCurrency(data.analysis.outcome.referenceAmount)}
              </strong>{" "}
              · Contratado:{" "}
              <strong>
                {formatCurrency(data.analysis.outcome.contractedAmount)}
              </strong>{" "}
              · Diferença:{" "}
              <strong>{formatCurrency(confirmedDiff)}</strong>
            </p>
          </section>
        )}

        <section>
          <div className="doc-section-title">
            <span>4 · Observações e aprovação</span>
          </div>
          <div className="rounded-md border border-dashed border-line px-3 py-2">
            <p className="whitespace-pre-line text-[9.5px] leading-relaxed text-[#33333f]">
              {data.analysis.notes || "Sem observações adicionais registradas."}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-6">
            {[
              {
                role: "Analista responsável",
                org: "Gerencial · Governança Condominial",
              },
              {
                role: "Síndico(a)",
                org: "Aprovação da assembleia / conselho",
              },
              {
                role: "Conselho consultivo",
                org: "Ciência e validação",
              },
            ].map((sig) => (
              <div key={sig.role}>
                <div className="h-[1px] w-full bg-slate-400" />
                <p className="mt-1 text-[8.5px] font-extrabold uppercase tracking-[0.1em] text-ink">
                  {sig.role}
                </p>
                <p className="text-[8px] leading-snug text-slate-500">
                  {sig.org}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-5 border-t border-line pt-2">
          <div className="flex items-start justify-between gap-4 text-[8px] text-slate-500">
            <span>
              Gerencial · Governança Condominial — documento gerado em {genDate}{" "}
              · protocolo {protocol}
            </span>
            <span className="text-right">
              {data.attachments.length > 0
                ? `Base analisada: ${data.attachments
                    .map((a) => a.name)
                    .join(", ")}`
                : "Sem documentos anexados"}
            </span>
          </div>
        </footer>
      </div>
    </article>
  );
}
