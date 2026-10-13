import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getAdminPaymentDetail } from "@/lib/admin-payments";
import { RetryInvoiceButton } from "@/components/admin/BillingSettingsForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ key: string }> };

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
const BOX = "rounded-lg border border-[#001F58]/12 bg-white";
const money = (n: unknown) => `AR$ ${NUMBER.format(Number(n))}`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-3 px-5 py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-800">{children}</dd>
    </div>
  );
}

// VA-92 · Etapa 5: detalle de un pago (compra o cobro de suscripción) con sus pagos de Mercado Pago,
// facturas (con "Reintentar" si quedó en error) y los eventos del webhook que lo procesaron.
export default async function AdminPaymentDetailPage({ params }: Props) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  const { key } = await params;
  const detail = await getAdminPaymentDetail(decodeURIComponent(key));
  if (!detail) notFound();

  const header =
    detail.type === "purchase"
      ? {
          title: detail.purchase.description || "Compra",
          user: detail.purchase.user,
          rows: [
            ["Fecha", DATE.format(detail.purchase.createdAt)],
            ["Precio", money(detail.purchase.originalPrice)],
            ["Descuento", Number(detail.purchase.discountAmount) > 0 ? `${money(detail.purchase.discountAmount)}${detail.purchase.coupon ? ` (cupón ${detail.purchase.coupon.code})` : ""}` : "—"],
            ["Total", money(detail.purchase.finalPrice)],
            ["Estado", detail.purchase.paymentStatus],
            ["Activada", detail.purchase.activatedAt ? DATE.format(detail.purchase.activatedAt) : "No"],
            [
              "Entrega",
              detail.purchase.plan
                ? `Saldo del ${detail.purchase.plan.name}`
                : [...detail.purchase.aircrafts, ...detail.purchase.spareParts].map((l) => l.title).join(", ") || "—",
            ],
          ],
        }
      : {
          title: `Suscripción – Plan ${detail.payment.subscription?.plan.name ?? ""}`,
          user: detail.payment.subscription!.user,
          rows: [
            ["Fecha", DATE.format(detail.payment.createdAt)],
            ["Monto", money(detail.payment.amount)],
            ["Suscripción", `${detail.payment.subscription?.status} · vigente hasta ${detail.payment.subscription ? DATE.format(detail.payment.subscription.currentPeriodEnd) : "—"}`],
            ["Preapproval MP", detail.payment.subscription?.mpSubscriptionId ?? "—"],
          ],
        };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/admin/payments" className="text-xs font-semibold text-slate-500 hover:text-[#001F58]">
          ← Pagos y facturas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#001F58]">{header.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          <Link href={`/profile/${header.user.id}`} className="font-semibold text-[#001F58] hover:underline">
            {header.user.name || "Sin nombre"}
          </Link>{" "}
          · {header.user.email}
        </p>
      </div>

      <section className={BOX}>
        <p className={`border-b border-[#001F58]/10 px-5 py-3 ${LABEL}`}>Resumen</p>
        <dl className="divide-y divide-slate-100">
          {header.rows.map(([label, value]) => (
            <Row key={label} label={label}>
              {value}
            </Row>
          ))}
        </dl>
      </section>

      <section className={BOX}>
        <p className={`border-b border-[#001F58]/10 px-5 py-3 ${LABEL}`}>Pagos de Mercado Pago</p>
        {detail.payments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Sin pagos registrados (cupón del 100% o todavía sin pagar).</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {detail.payments.map((p) => (
              <li key={p.id} className="space-y-3 px-5 py-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-xs text-slate-500">Pago MP {p.mpPaymentId}</p>
                  <p className="font-semibold tabular-nums text-[#001F58]">{money(p.amount)}</p>
                </div>
                <p className="text-slate-700">
                  {p.status}
                  {p.statusDetail ? ` (${p.statusDetail})` : ""} · {p.method ?? "—"}
                  {p.approvedAt ? ` · aprobado ${DATE.format(p.approvedAt)}` : ""}
                  {Number(p.refundedAmount) > 0 ? ` · reintegrado ${money(p.refundedAmount)}` : ""}
                </p>
                {p.invoices.length > 0 && (
                  <div className="rounded-md border border-slate-200">
                    {p.invoices.map((inv) => (
                      <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-0">
                        <div className="min-w-0 text-xs text-slate-700">
                          <span className="font-semibold">{inv.kind === "FACTURA_C" ? "Factura C" : "Nota de crédito C"}</span> · {inv.status} · {money(inv.total)}
                          {inv.number != null && ` · N.º ${String(inv.pointOfSale ?? 0).padStart(5, "0")}-${String(inv.number).padStart(8, "0")}`}
                          {inv.cae && ` · CAE ${inv.cae}`}
                          {inv.attempts > 0 && ` · ${inv.attempts} intento(s)`}
                          {inv.errors && <p className="mt-1 whitespace-pre-wrap text-red-700">{inv.errors}</p>}
                        </div>
                        {inv.status === "ERROR" && <RetryInvoiceButton invoiceId={inv.id} />}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={BOX}>
        <p className={`border-b border-[#001F58]/10 px-5 py-3 ${LABEL}`}>Eventos del webhook</p>
        {detail.events.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Sin notificaciones de Mercado Pago para este pago.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="border-b border-[#001F58]/10 text-left">
                <tr className={LABEL}>
                  <th className="px-4 py-2 font-semibold">Recibido</th>
                  <th className="px-4 py-2 font-semibold">Tópico</th>
                  <th className="px-4 py-2 font-semibold">Firma</th>
                  <th className="px-4 py-2 font-semibold">Estado</th>
                  <th className="px-4 py-2 font-semibold">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.events.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-slate-600">{DATE.format(e.receivedAt)}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {e.topic}
                      {e.action ? ` · ${e.action}` : ""}
                    </td>
                    <td className={`px-4 py-2 font-semibold ${e.signatureValid ? "text-emerald-700" : "text-red-700"}`}>{e.signatureValid ? "Válida" : "Rechazada"}</td>
                    <td className="px-4 py-2 font-semibold text-slate-700">{e.status}</td>
                    <td className="px-4 py-2 text-slate-600">{e.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
