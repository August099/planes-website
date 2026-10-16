import Link from "next/link";
import { redirect } from "next/navigation";
import type { InvoiceStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-helpers";
import { billingEnabled, mpIsTestMode } from "@/lib/mercadopago";
import { getBillingSettings } from "@/lib/billing-settings";
import { PAYMENT_FILTERS, invoiceCounts, invoicedLast12Months, listAdminPayments } from "@/lib/admin-payments";
import { BillingSettingsForm } from "@/components/admin/BillingSettingsForm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ payment?: string; invoice?: string; from?: string; to?: string }> };

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
const TONE = { ok: "bg-emerald-50 text-emerald-800", wait: "bg-amber-50 text-amber-800", bad: "bg-red-50 text-red-800", muted: "bg-slate-100 text-slate-600" };
const INVOICE_LABEL: Record<InvoiceStatus, string> = { PENDING: "Pendiente", ISSUED: "Emitida", ERROR: "Error", ISSUED_SIMULATED: "Simulada", SKIPPED: "Descartada" };
const INVOICE_TONE: Record<InvoiceStatus, string> = {
  PENDING: "text-amber-800",
  ISSUED: "text-emerald-800",
  ERROR: "text-red-700",
  ISSUED_SIMULATED: "text-slate-500",
  SKIPPED: "text-slate-500",
};

const day = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

// VA-92 · Etapa 5: "Pagos y facturas". Pagos únicos y cobros de suscripciones con su factura, filtros,
// exportación CSV para el contador, configuración de facturación y el indicador del monotributo.
export default async function AdminPaymentsPage({ searchParams }: Props) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  const sp = await searchParams;
  const from = day(sp.from);
  const to = day(sp.to);
  const invoice = ["PENDING", "ISSUED", "ERROR", "ISSUED_SIMULATED", "SKIPPED", "NONE"].includes(sp.invoice ?? "") ? (sp.invoice as InvoiceStatus | "NONE") : undefined;

  const [rows, settings, invoiced, counts] = await Promise.all([
    listAdminPayments({
      payment: sp.payment,
      invoice,
      from: from ? new Date(`${from}T00:00:00-03:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59-03:00`) : undefined,
    }),
    getBillingSettings(),
    invoicedLast12Months(),
    invoiceCounts(),
  ]);

  const cap = settings.monotributoAnnualCap;
  const pct = cap ? Math.round((invoiced / cap) * 100) : null;
  const overThreshold = pct != null && pct >= settings.alertThresholdPercent;
  const billingOn = billingEnabled();
  const exportQuery = new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString();

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#001F58]">Pagos y facturas</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Pagos únicos y cobros de suscripciones de Mercado Pago{mpIsTestMode() ? " (credenciales de prueba)" : ""}, con su factura C.
          </p>
        </div>
        <a
          href={`/admin/payments/export${exportQuery ? `?${exportQuery}` : ""}`}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#001F58]/20 bg-white px-4 text-xs font-bold text-[#001F58] hover:bg-slate-50"
        >
          Exportar CSV {from || to ? "del período" : "del mes"}
        </a>
      </div>

      {/* Indicadores */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#001F58]/12 bg-white p-5">
          <p className={LABEL}>Facturado últimos 12 meses</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#001F58]">AR$ {NUMBER.format(invoiced)}</p>
          <p className="mt-1 text-xs text-slate-500">Facturas emitidas menos notas de crédito.</p>
        </div>
        <div className={`rounded-lg border p-5 ${overThreshold ? "border-red-300 bg-red-50" : "border-[#001F58]/12 bg-white"}`}>
          <p className={LABEL}>Tope del monotributo</p>
          {cap ? (
            <>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${overThreshold ? "text-red-700" : "text-[#001F58]"}`}>{pct}%</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div className={`h-full ${overThreshold ? "bg-red-600" : "bg-[#001F58]"}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                de AR$ {NUMBER.format(cap)} · alerta al {settings.alertThresholdPercent}%
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-600">Cargá el tope de tu categoría abajo.</p>
          )}
        </div>
        <div className="rounded-lg border border-[#001F58]/12 bg-white p-5">
          <p className={LABEL}>Facturación</p>
          <p className={`mt-1 text-sm font-semibold ${billingOn ? "text-emerald-700" : "text-amber-800"}`}>{billingOn ? "Activa" : "Desactivada (BILLING_ENABLED)"}</p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            {counts.pending} pendientes · {counts.issued} emitidas · {counts.error} con error · {counts.simulated} simuladas ·{" "}
            {counts.skipped} descartadas
          </p>
          {!billingOn && <p className="mt-1 text-xs text-slate-500">Los pagos funcionan; las facturas quedan pendientes hasta activar TusFacturas.</p>}
        </div>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-[#001F58]/12 bg-white p-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Pago</span>
          <select name="payment" defaultValue={sp.payment ?? ""} className="rounded-md border border-slate-300 bg-white px-3 py-2">
            <option value="">Todos</option>
            {PAYMENT_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Factura</span>
          <select name="invoice" defaultValue={invoice ?? ""} className="rounded-md border border-slate-300 bg-white px-3 py-2">
            <option value="">Todas</option>
            <option value="PENDING">Pendiente</option>
            <option value="ISSUED">Emitida</option>
            <option value="ERROR">Con error</option>
            <option value="ISSUED_SIMULATED">Simulada (prueba)</option>
            <option value="SKIPPED">Descartada</option>
            <option value="NONE">Sin factura</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Desde</span>
          <input type="date" name="from" defaultValue={from} className="rounded-md border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">Hasta</span>
          <input type="date" name="to" defaultValue={to} className="rounded-md border border-slate-300 bg-white px-3 py-2" />
        </label>
        <button type="submit" className="min-h-10 rounded-md bg-[#001F58] px-4 text-xs font-bold text-white hover:bg-[#00133A] cursor-pointer">
          Filtrar
        </button>
        {(sp.payment || invoice || from || to) && (
          <Link href="/admin/payments" className="min-h-10 px-2 py-2 text-xs font-semibold text-slate-500 hover:text-red-700">
            Limpiar
          </Link>
        )}
      </form>

      {/* Listado */}
      <div className="overflow-x-auto rounded-lg border border-[#001F58]/12 bg-white">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-[#001F58]/10 text-left">
            <tr className={LABEL}>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold">Concepto</th>
              <th className="px-4 py-3 text-right font-semibold">Monto</th>
              <th className="px-4 py-3 font-semibold">Pago</th>
              <th className="px-4 py-3 font-semibold">Factura</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No hay pagos con esos filtros.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{DATE.format(r.date)}</td>
                <td className="px-4 py-3">
                  <Link href={`/profile/${r.user.id}`} className="font-semibold text-[#001F58] hover:underline">
                    {r.user.name || "Sin nombre"}
                  </Link>
                  <p className="text-xs text-slate-500">{r.user.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {r.description}
                  <p className="text-xs text-slate-500">{r.kind}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-[#001F58]">
                  {r.amount === 0 ? "Sin cargo" : `AR$ ${NUMBER.format(r.amount)}`}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold ${TONE[r.paymentTone]}`}>{r.paymentLabel}</span>
                  {r.mpPaymentId && <p className="mt-0.5 font-mono text-[11px] text-slate-400">MP {r.mpPaymentId}</p>}
                  {r.isTest && <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Prueba</p>}
                </td>
                <td className={`px-4 py-3 text-xs font-semibold ${r.invoiceStatus ? INVOICE_TONE[r.invoiceStatus] : "text-slate-400"}`}>
                  {r.invoiceStatus ? INVOICE_LABEL[r.invoiceStatus] : r.amount === 0 ? "No corresponde" : "—"}
                </td>
                <td className="px-4 py-3 text-right text-xs">
                  <Link href={`/admin/payments/${encodeURIComponent(r.key)}`} className="font-semibold text-[#001F58] hover:underline">
                    Detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-4 rounded-lg border border-[#001F58]/12 bg-white p-5 sm:p-6">
        <div>
          <p className={LABEL}>Configuración</p>
          <h2 className="mt-1 text-lg font-bold text-[#001F58]">Facturación y suscripciones</h2>
        </div>
        <BillingSettingsForm
          initial={{
            monotributoAnnualCap: settings.monotributoAnnualCap,
            alertThresholdPercent: settings.alertThresholdPercent,
            dniRequiredFrom: settings.dniRequiredFrom,
            graceDays: settings.graceDays,
            maxInvoiceAttempts: settings.maxInvoiceAttempts,
          }}
        />
      </section>
    </div>
  );
}
