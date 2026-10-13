import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AutoRefresh } from "@/components/checkout/AutoRefresh";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = { title: "Estado del pago", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ purchase?: string; status?: string; collection_status?: string }>;
}

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

// VA-92: vuelta de Mercado Pago (back_urls) y destino del cupón del 100%. Solo muestra el estado
// que dejó el webhook en la base; el ?status= de Mercado Pago se usa únicamente para el texto
// mientras el webhook no llegó (nunca para activar).
export default async function PaymentStatusPage({ searchParams }: Props) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/payment/status?purchase=${params.purchase ?? ""}`)}`);
  if (!params.purchase) notFound();

  const purchase = await prisma.purchase.findUnique({
    where: { id: params.purchase },
    include: {
      plan: { select: { id: true, name: true } },
      aircrafts: { select: { id: true, title: true } },
      spareParts: { select: { id: true, title: true } },
      hangars: { select: { id: true, title: true } },
    },
  });
  if (!purchase || (purchase.userId !== user.id && !user.isAdmin)) notFound();

  const listing =
    (purchase.aircrafts[0] && { ...purchase.aircrafts[0], href: `/planes/plane-details/${purchase.aircrafts[0].id}`, type: "aircraft" }) ||
    (purchase.spareParts[0] && { ...purchase.spareParts[0], href: `/spareparts/sparepart-details/${purchase.spareParts[0].id}`, type: "parts" }) ||
    (purchase.hangars[0] && { ...purchase.hangars[0], href: `/services/hangars/hangar-details/${purchase.hangars[0].id}`, type: "hangar" }) ||
    null;
  const retryHref = listing
    ? `/checkout?listing=${listing.type}:${listing.id}`
    : purchase.plan
      ? `/checkout?planId=${purchase.plan.id}`
      : purchase.listingKind
        ? `/checkout?planId=${purchase.listingKind === "AIRCRAFT" ? "listing-aircraft" : "listing-parts"}`
        : "/plans";

  const mpStatus = params.status ?? params.collection_status ?? null;
  const total = Number(purchase.finalPrice);
  const state = purchase.activatedAt
    ? purchase.paymentStatus === "REFUNDED"
      ? "refunded"
      : "active"
    : purchase.paymentStatus === "REJECTED" || purchase.paymentStatus === "CANCELLED" || mpStatus === "rejected" || mpStatus === "null"
      ? "failed"
      : purchase.paymentStatus === "IN_PROCESS" || mpStatus === "pending" || mpStatus === "in_process"
        ? "pending"
        : "confirming";

  const box = "rounded-lg border border-[#001F58]/12 bg-white p-6 sm:p-8";
  const primary = "inline-flex min-h-11 items-center rounded-md bg-[#001F58] px-5 text-sm font-bold text-white hover:bg-[#00133A]";
  const secondary = "inline-flex min-h-11 items-center rounded-md border border-[#001F58]/20 px-5 text-sm font-semibold text-[#001F58] hover:bg-slate-50";

  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] px-4 pb-20 pt-6">
      <PageBackground page="plans" />
      <div className="container mx-auto max-w-2xl">
        <Breadcrumbs items={[{ label: "Pago" }]} className="mb-8" />
        <section className={box} aria-live="polite">
          <p className={LABEL}>{purchase.description || "Compra"}</p>

          {state === "active" && (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#001F58]">
                <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden />
                {total === 0 ? "¡Listo! Lo activamos sin cargo." : "¡Pago acreditado!"}
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                {listing
                  ? `Tu aviso “${listing.title}” ya está publicado.`
                  : purchase.plan
                    ? `Tu ${purchase.plan.name} ya está disponible: cada vez que publiques, se descuenta de tu saldo.`
                    : "Ya tenés el aviso disponible para publicar."}
                {total > 0 && " Te enviamos la factura por email cuando esté emitida."}
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
                <Link href={`/profile/${user.id}`} className={secondary}>
                  Ir a mi perfil
                </Link>
              </div>
            </>
          )}

          {state === "confirming" && (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#001F58]">
                <Clock className="h-7 w-7 shrink-0 text-[#001F58]" aria-hidden />
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
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#001F58]">
                <Clock className="h-7 w-7 shrink-0 text-amber-600" aria-hidden />
                Tu pago está pendiente
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                Mercado Pago todavía no lo acreditó (con efectivo puede tardar hasta 2 días hábiles). Cuando se acredite, activamos tu
                compra automáticamente.
              </p>
              <AutoRefresh everyMs={15_000} maxMs={10 * 60_000} />
            </>
          )}

          {state === "failed" && (
            <>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#001F58]">
                <XCircle className="h-7 w-7 shrink-0 text-[#E70F1F]" aria-hidden />
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
              <h1 className="mt-2 text-2xl font-bold text-[#001F58]">Pago reintegrado</h1>
              <p className="mt-3 text-sm text-slate-600">Este pago se devolvió y la compra quedó sin efecto.</p>
            </>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-[#001F58]/10 pt-4 text-sm">
            <dt className="text-slate-500">Total</dt>
            <dd className="text-right font-semibold tabular-nums text-[#001F58]">{total === 0 ? "Sin cargo" : `AR$ ${NUMBER.format(total)}`}</dd>
            <dt className="text-slate-500">Referencia</dt>
            <dd className="text-right font-mono text-xs text-slate-600">{purchase.id.slice(-8).toUpperCase()}</dd>
          </dl>
        </section>
      </div>
    </main>
  );
}
