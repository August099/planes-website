import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { pendingPaymentExpired } from "@/lib/payments/pending";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AutoRefresh } from "@/components/checkout/AutoRefresh";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = { title: "Estado del pago", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ purchase?: string; subscription?: string; status?: string; collection_status?: string }>;
}

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

// VA-92: vuelta de Mercado Pago (back_urls) y destino del cupón del 100%. Solo muestra el estado
// que dejó el webhook en la base; el ?status= de Mercado Pago se usa únicamente para el texto
// mientras el webhook no llegó (nunca para activar).
export default async function PaymentStatusPage({ searchParams }: Props) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user?.id) {
    const q = params.subscription ? `subscription=${params.subscription}` : `purchase=${params.purchase ?? ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(`/payment/status?${q}`)}`);
  }
  if (params.subscription) return <SubscriptionStatus id={params.subscription} userId={user.id} isAdmin={!!user.isAdmin} />;
  if (!params.purchase) notFound();

  const purchase = await prisma.purchase.findUnique({
    where: { id: params.purchase },
    include: {
      plan: { select: { id: true, name: true } },
      aircrafts: { select: { id: true, title: true } },
      // VA-105: la factura para descargar acá mismo cuando esté emitida.
      payments: { where: { status: "approved" }, select: { invoices: { where: { kind: "FACTURA_C" }, select: { id: true, status: true, pdfPath: true } } } },
      spareParts: { select: { id: true, title: true } },
      hangars: { select: { id: true, title: true } },
    },
  });
  if (!purchase || (purchase.userId !== user.id && !user.isAdmin)) notFound();

  const listing =
    (purchase.aircrafts[0] && { ...purchase.aircrafts[0], href: `/aircraft/${purchase.aircrafts[0].id}`, type: "aircraft" }) ||
    (purchase.spareParts[0] && { ...purchase.spareParts[0], href: `/spareparts/sparepart-details/${purchase.spareParts[0].id}`, type: "parts" }) ||
    (purchase.hangars[0] && { ...purchase.hangars[0], href: `/services/hangars/hangar-details/${purchase.hangars[0].id}`, type: "hangar" }) ||
    null;
  // VA-152: ya no se paga por aviso; las compras viejas de un aviso llevan a /plans al reintentar.
  const retryHref = !listing && purchase.plan ? `/checkout?planId=${purchase.plan.id}` : "/plans";

  const mpStatus = params.status ?? params.collection_status ?? null;
  const invoiceReady = purchase.payments.flatMap((p) => p.invoices).find((i) => i.status === "ISSUED" && i.pdfPath) ?? null;
  const total = Number(purchase.finalPrice);
  const state = purchase.activatedAt
    ? purchase.paymentStatus === "REFUNDED"
      ? "refunded"
      : "active"
    : purchase.paymentStatus === "REJECTED" || purchase.paymentStatus === "CANCELLED" || mpStatus === "rejected" || mpStatus === "null" || pendingPaymentExpired(purchase)
      ? "failed"
      : purchase.paymentStatus === "IN_PROCESS" || mpStatus === "pending" || mpStatus === "in_process"
        ? "pending"
        : "confirming";

  const box = "rounded-lg border border-[#00205B]/12 bg-white p-6 sm:p-8";
  const primary = "inline-flex min-h-11 items-center rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#001331]";
  const secondary = "inline-flex min-h-11 items-center rounded-md border border-[#00205B]/20 px-5 text-sm font-semibold text-[#00205B] hover:bg-slate-50";

  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] px-4 pb-20 pt-6">
      <PageBackground page="plans" />
      <div className="container mx-auto max-w-2xl">
        <Breadcrumbs items={[{ label: "Pago" }]} className="mb-8" />
        <section className={box} aria-live="polite">
          <p className={LABEL}>{purchase.description || "Compra"}</p>

          {state === "active" && (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#00205B]">
                <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden />
                {total === 0 ? "¡Listo! Lo activamos sin cargo." : "¡Pago acreditado!"}
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                {listing
                  ? `Tu aviso “${listing.title}” ya está publicado.`
                  : purchase.plan
                    ? `Tu ${purchase.plan.name} ya está disponible.`
                    : "Tu compra ya está acreditada."}
                {total > 0 && !invoiceReady && " Te enviamos la factura por email cuando esté emitida; también la vas a encontrar en Mis compras."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {listing ? (
                  <Link href={listing.href} className={primary}>
                    Ver mi aviso
                  </Link>
                ) : (
                  <Link href="/publish" className={primary}>
                    Publicar ahora
                  </Link>
                )}
                {invoiceReady && (
                  <a href={`/api/invoices/${invoiceReady.id}/pdf`} className={secondary}>
                    Descargar factura
                  </a>
                )}
                <Link href={`/profile/${user.id}`} className={secondary}>
                  Ir a mi perfil
                </Link>
              </div>
            </>
          )}

          {state === "confirming" && (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#00205B]">
                <Clock className="h-7 w-7 shrink-0 text-[#00205B]" aria-hidden />
                Estamos confirmando tu pago…
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                Mercado Pago nos avisa en unos segundos. No hace falta que recargues: esta página se actualiza sola.
              </p>
              <AutoRefresh />
            </>
          )}

          {state === "pending" && (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#00205B]">
                <Clock className="h-7 w-7 shrink-0 text-amber-600" aria-hidden />
                Tu pago está pendiente
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                Mercado Pago todavía no lo acreditó (a veces revisa el pago unos minutos). Cuando se acredite, activamos tu
                compra automáticamente.
              </p>
              <AutoRefresh everyMs={15_000} maxMs={10 * 60_000} />
            </>
          )}

          {state === "failed" && (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#00205B]">
                <XCircle className="h-7 w-7 shrink-0 text-[#D62828]" aria-hidden />
                El pago no se completó
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                No se te cobró nada. Podés intentarlo de nuevo con otro medio de pago.
                {listing && ` Tu aviso “${listing.title}” sigue guardado.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={retryHref} className={primary}>
                  Intentar de nuevo
                </Link>
                <Link href={`/profile/${user.id}`} className={secondary}>
                  Ir a mi perfil
                </Link>
              </div>
            </>
          )}

          {state === "refunded" && (
            <>
              <h1 className="mt-2 text-2xl font-bold text-[#00205B]">Pago reintegrado</h1>
              <p className="mt-3 text-sm text-slate-600">Este pago se devolvió y la compra quedó sin efecto.</p>
            </>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-[#00205B]/10 pt-4 text-sm">
            <dt className="text-slate-500">Total</dt>
            <dd className="text-right font-semibold tabular-nums text-[#00205B]">{total === 0 ? "Sin cargo" : `AR$ ${NUMBER.format(total)}`}</dd>
            <dt className="text-slate-500">Referencia</dt>
            <dd className="text-right font-mono text-xs text-slate-600">{purchase.id.slice(-8).toUpperCase()}</dd>
          </dl>
        </section>
      </div>
    </main>
  );
}

const DATE = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

// VA-92: vuelta de Mercado Pago al autorizar una suscripción (back_url del preapproval). Igual que en
// los pagos únicos, la activa el webhook del primer cobro: acá solo se muestra el estado.
async function SubscriptionStatus({ id, userId, isAdmin }: { id: string; userId: string; isAdmin: boolean }) {
  const sub = await prisma.subscription.findUnique({ where: { id }, include: { plan: { select: { name: true, id: true } } } });
  if (!sub || (sub.userId !== userId && !isAdmin)) notFound();
  const now = new Date();
  const active = (sub.status === "ACTIVE" && sub.currentPeriodEnd > now) || (sub.status === "PAST_DUE" && !!sub.graceUntil && sub.graceUntil > now);
  const box = "rounded-lg border border-[#00205B]/12 bg-white p-6 sm:p-8";
  const primary = "inline-flex min-h-11 items-center rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#001331]";
  const secondary = "inline-flex min-h-11 items-center rounded-md border border-[#00205B]/20 px-5 text-sm font-semibold text-[#00205B] hover:bg-slate-50";

  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] px-4 pb-20 pt-6">
      <PageBackground page="plans" />
      <div className="container mx-auto max-w-2xl">
        <Breadcrumbs items={[{ label: "Suscripción" }]} className="mb-8" />
        <section className={box} aria-live="polite">
          <p className={LABEL}>Plan {sub.plan.name}</p>
          {active ? (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#00205B]">
                <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden />
                ¡Tu suscripción está activa!
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                Vigente hasta el {DATE.format(sub.currentPeriodEnd)}. El débito se renueva solo; lo podés cancelar desde tu perfil.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/publish" className={primary}>
                  Publicar
                </Link>
                <Link href={`/profile/${sub.userId}`} className={secondary}>
                  Ir a mi perfil
                </Link>
              </div>
            </>
          ) : sub.status === "PENDING" ? (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#00205B]">
                <Clock className="h-7 w-7 shrink-0 text-[#00205B]" aria-hidden />
                Estamos confirmando tu suscripción…
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                Cuando Mercado Pago acredite el primer cobro, activamos tu plan. Esta página se actualiza sola.
              </p>
              <AutoRefresh everyMs={5000} maxMs={5 * 60_000} />
            </>
          ) : (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#00205B]">
                <XCircle className="h-7 w-7 shrink-0 text-[#D62828]" aria-hidden />
                La suscripción no está activa
              </h1>
              <p className="mt-3 text-sm text-slate-600">Podés volver a suscribirte cuando quieras.</p>
              <div className="mt-6">
                <Link href={`/checkout?planId=${sub.plan.id}`} className={primary}>
                  Suscribirme de nuevo
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
