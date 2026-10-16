import Link from "next/link";
import { Download } from "lucide-react";
import type { PurchaseRow } from "@/lib/purchases";
import { WithdrawalButton } from "@/components/ui/profile/WithdrawalButton";

// VA-92 · Etapa 5: "Mis compras" (solo el dueño del perfil). Tabla en escritorio y lista en celular.
// La factura se descarga desde acá cuando TusFacturas la emita (mientras tanto, "En preparación").

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
const TONE: Record<PurchaseRow["payment"]["tone"], string> = {
  ok: "bg-emerald-50 text-emerald-800",
  wait: "bg-amber-50 text-amber-800",
  bad: "bg-red-50 text-red-800",
  muted: "bg-slate-100 text-slate-600",
};

const money = (n: number) => (n === 0 ? "Sin cargo" : `AR$ ${NUMBER.format(n)}`);

function Status({ row }: { row: PurchaseRow }) {
  return <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold ${TONE[row.payment.tone]}`}>{row.payment.label}</span>;
}

function Invoice({ row }: { row: PurchaseRow }) {
  if (!row.invoice) return <span className="text-slate-400">—</span>;
  if (row.invoice.downloadHref) {
    return (
      <a href={row.invoice.downloadHref} className="inline-flex items-center gap-1 font-semibold text-[#001F58] hover:text-[#E70F1F]">
        <Download className="h-3.5 w-3.5" aria-hidden />
        Descargar
      </a>
    );
  }
  return <span className="text-slate-500">{row.invoice.label}</span>;
}

export function PurchasesPanel({ rows }: { rows: PurchaseRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-lg border border-[#001F58]/12 bg-white p-6 text-sm text-slate-600">
        Todavía no hiciste compras.{" "}
        <Link href="/plans" className="font-semibold text-[#001F58] underline">
          Ver planes
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[#001F58]/12 bg-white">
      <div id="mis-compras" className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#001F58]/10 px-5 py-3">
        <p className={LABEL}>Mis compras</p>
        {/* VA-125 */}
        <p className="text-xs text-slate-500">Botón de arrepentimiento: podés pedir la devolución hasta 10 días después de cada pago.</p>
      </div>

      {/* Escritorio */}
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-[#001F58]/10 text-left">
            {["Fecha", "Concepto", "Monto", "Pago", "Factura", ""].map((h) => (
              <th key={h} className={`px-5 py-2 ${LABEL} ${h === "Monto" ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-5 py-3 tabular-nums text-slate-600">{DATE.format(new Date(r.date))}</td>
              <td className="px-5 py-3 text-slate-800">{r.description}</td>
              <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-[#001F58]">{money(r.amount)}</td>
              <td className="px-5 py-3">
                <Status row={r} />
              </td>
              <td className="px-5 py-3 text-xs">
                <Invoice row={r} />
              </td>
              <td className="px-5 py-3 text-right text-xs">
                <div className="flex items-center justify-end gap-3">
                  {r.withdrawal && <WithdrawalButton paymentId={r.withdrawal.paymentId} until={r.withdrawal.until} description={r.description} />}
                  {r.href && (
                    <Link href={r.href} className="font-semibold text-[#001F58] hover:underline">
                      Ver
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Celular */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2 px-5 py-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 font-medium text-slate-800">{r.description}</p>
              <p className="shrink-0 font-semibold tabular-nums text-[#001F58]">{money(r.amount)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="tabular-nums text-slate-500">{DATE.format(new Date(r.date))}</span>
              <Status row={r} />
              {r.invoice && (
                <span>
                  Factura: <Invoice row={r} />
                </span>
              )}
              {r.withdrawal && (
                <span className="ml-auto">
                  <WithdrawalButton paymentId={r.withdrawal.paymentId} until={r.withdrawal.until} description={r.description} />
                </span>
              )}
              {r.href && (
                <Link href={r.href} className={`${r.withdrawal ? "" : "ml-auto "}font-semibold text-[#001F58] hover:underline`}>
                  Ver
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
