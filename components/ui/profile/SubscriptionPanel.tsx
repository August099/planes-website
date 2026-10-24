"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelSubscriptionAction, resumeSubscriptionAction } from "@/app/actions/subscription-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SubscriptionSummary } from "@/lib/subscriptions";
import type { ProfileQuota } from "@/components/ui/profile/ProfileListings";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

// VA-80: el plan del usuario en "Mi perfil" → Ajustes. Sin suscripción, el plan Base e invita a ver los
// planes. VA-174: los admins tienen el Broker completo para siempre.
export function SubscriptionPanel({ subscription, quota = null }: { subscription: SubscriptionSummary | null; quota?: ProfileQuota | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: typeof cancelSubscriptionAction) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  if (quota?.planName === "Admin") {
    return (
      <section className="rounded-lg border border-[#001F58]/12 bg-white p-5">
        <p className={LABEL}>Tu plan</p>
        <p className="mt-1 text-lg font-bold text-[#001F58]">Admin</p>
        <p className="text-sm text-slate-600">Todo lo del Broker / Empresa, con aviones y repuestos ilimitados, sin suscripción ni vencimiento.</p>
      </section>
    );
  }

  if (!subscription || !subscription.active) {
    const base = quota ? `: ${quota.aircraft.limit ?? "∞"} ${quota.aircraft.limit === 1 ? "avión" : "aviones"} y ${quota.parts.limit ?? "∞"} ${quota.parts.limit === 1 ? "repuesto" : "repuestos"} activos` : "";
    return (
      <section className="rounded-lg border border-[#001F58]/12 bg-white p-5">
        <p className={LABEL}>Tu plan</p>
        <p className="mt-1 text-sm text-slate-700">
          {subscription ? `Tu suscripción a ${subscription.planName} terminó. ` : ""}Tenés el plan Base, gratis{base}.{" "}
          <Link href="/plans" className="font-semibold text-[#001F58] underline">
            Ver planes
          </Link>
        </p>
      </section>
    );
  }

  const end = DATE.format(new Date(subscription.currentPeriodEnd));
  const per = subscription.interval === "YEARLY" ? "año" : "mes";

  // VA-92: cortesía (asignada por el admin): sin precio, sin cobros y sin cancelar.
  if (subscription.courtesy) {
    return (
      <section className="rounded-lg border border-[#001F58]/12 bg-white">
        <div className="p-5">
          <p className={LABEL}>Tu plan</p>
          <p className="mt-1 text-lg font-bold text-[#001F58]">{subscription.planName}</p>
          <p className="text-sm text-slate-600">
            Plan de cortesía, sin cargo
          </p>
        </div>
        <p className="border-t border-[#001F58]/10 px-5 py-3 text-sm text-slate-600">
          Vigente hasta el <strong>{end}</strong>. No se cobra ni se renueva solo.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[#001F58]/12 bg-white">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={LABEL}>Tu plan</p>
          <p className="mt-1 text-lg font-bold text-[#001F58]">{subscription.planName}</p>
          <p className="text-sm tabular-nums text-slate-600">
            AR$ {NUMBER.format(subscription.price)} por {per}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {/* VA-186 */}
          <Link href="/plans" className="rounded-md border border-[#001F58]/20 px-4 py-2 text-xs font-semibold text-[#001F58] hover:bg-slate-50">
            Cambiar de plan
          </Link>
          {subscription.cancelAtPeriodEnd ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(resumeSubscriptionAction)}
              className="self-start rounded-md border border-[#001F58]/20 px-4 py-2 text-xs font-semibold text-[#001F58] hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Seguir suscripto
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="self-start rounded-md px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
            >
              Cancelar suscripción
            </button>
          )}
        </div>
      </div>
      {/* VA-92: cobro rechazado: sigue con los beneficios hasta graceUntil. */}
      {subscription.graceUntil && (
        <p className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
          No pudimos cobrar tu plan. Revisá el medio de pago en tu cuenta de Mercado Pago: el cobro se reintenta solo. Si no se
          acredita, el plan se da de baja el <strong>{DATE.format(new Date(subscription.graceUntil))}</strong>.
        </p>
      )}
      <p className="border-t border-[#001F58]/10 px-5 py-3 text-sm text-slate-600">
        {subscription.cancelAtPeriodEnd ? (
          <>Cancelada: la podés usar hasta el <strong>{end}</strong> y después no se cobra más.</>
        ) : (
          <>Próximo cobro: <strong>{end}</strong>.</>
        )}
      </p>
      {error && !open && <p className="px-5 pb-3 text-xs font-medium text-red-700">{error}</p>}

      <ConfirmDialog
        open={open}
        eyebrow="Cancelar suscripción"
        title={subscription.planName}
        confirmLabel="Cancelar suscripción"
        danger
        pending={pending}
        error={error}
        onConfirm={() => run(cancelSubscriptionAction)}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
      >
        <p className="text-sm text-slate-600">
          Vas a poder usar el plan hasta el <strong>{end}</strong>. Después no se vuelve a cobrar y pasás al plan Base: si tenés
          más avisos activos que su cupo, se pausan los más nuevos (después elegís cuáles quedan activos).
        </p>
      </ConfirmDialog>
    </section>
  );
}
