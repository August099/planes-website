"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelSubscriptionAction, resumeSubscriptionAction } from "@/app/actions/subscription-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SubscriptionSummary } from "@/lib/subscriptions";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

// VA-80: el plan del usuario en "Mi perfil" → Ajustes. Sin suscripción, invita a ver los planes.
export function SubscriptionPanel({ subscription }: { subscription: SubscriptionSummary | null }) {
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

  if (!subscription || !subscription.active) {
    return (
      <section className="rounded-lg border border-[#001F58]/12 bg-white p-5">
        <p className={LABEL}>Tu plan</p>
        <p className="mt-1 text-sm text-slate-700">
          {subscription ? `Tu suscripción a ${subscription.planName} terminó.` : "Publicás aviso por aviso, sin suscripción."}{" "}
          <Link href="/plans" className="font-semibold text-[#001F58] underline">
            Ver planes
          </Link>
        </p>
      </section>
    );
  }

  const end = DATE.format(new Date(subscription.currentPeriodEnd));
  const per = subscription.interval === "YEARLY" ? "año" : "mes";

  return (
    <section className="rounded-lg border border-[#001F58]/12 bg-white">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={LABEL}>Tu plan</p>
          <p className="mt-1 text-lg font-bold text-[#001F58]">{subscription.planName}</p>
          <p className="text-sm tabular-nums text-slate-600">
            AR$ {NUMBER.format(subscription.price)} por {per}
            {subscription.noExpiry && " · tus avisos no vencen"}
          </p>
        </div>
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
          Vas a poder usar el plan hasta el <strong>{end}</strong>. Después no se vuelve a cobrar
          {subscription.noExpiry ? " y tus avisos vuelven a tener fecha de vencimiento" : ""}.
        </p>
      </ConfirmDialog>
    </section>
  );
}
