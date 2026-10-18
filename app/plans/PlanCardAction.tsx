"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cancelSubscriptionAction, resumeSubscriptionAction } from "@/app/actions/subscription-actions";
import type { MyPlanState } from "@/app/actions/plan-state-actions";

export type PlanActionPlan = { id: string; name: string; popular: boolean };

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

// VA-121: botón de cada plan de /plans. Sin suscripción: "Suscribirme". Con una suscripción vigente:
// "Cancelar suscripción" en el plan actual y "Cambiar a este plan" en los otros (cambio inmediato, sin
// prorrateo; VA-152: también entre las opciones del Empresarial).
export function PlanCardAction({
  plan,
  state,
  onStateChange,
}: {
  plan: PlanActionPlan;
  state: MyPlanState;
  onStateChange: (s: MyPlanState) => void;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = "w-full min-h-11 py-3 px-4 rounded-md font-bold text-sm text-center transition-colors flex items-center justify-center gap-2";
  // El plan destacado lleva el CTA rojo; el resto, el azul de marca (pautas de diseño).
  const primary = plan.popular ? "bg-[#E70F1F] hover:bg-[#C20D1A] text-white" : "bg-[#001F58] hover:bg-[#00133A] text-white";
  const secondary = "border border-[#001F58]/25 text-[#001F58] hover:bg-[#001F58]/5";
  const note = "mt-2 text-xs text-slate-500";

  const checkout = (label: string) => (
    <Link href={`/checkout?planId=${plan.id}`} className={`${base} ${primary}`}>
      <span>{label}</span>
      <ArrowRight className="w-4 h-4" />
    </Link>
  );

  if (!state) return checkout("Suscribirme");

  const isCurrent = state.planId === plan.id;
  const until = dateFmt.format(new Date(state.currentPeriodEnd));

  if (state.courtesy) {
    return isCurrent ? (
      <p className={`${base} ${secondary} cursor-default`}>Tu plan actual (cortesía)</p>
    ) : (
      <p className={`${base} ${secondary} cursor-default opacity-70`}>Tenés un plan de cortesía</p>
    );
  }

  if (!isCurrent) {
    return (
      <div>
        {checkout(state.pendingPlanId === plan.id ? "Completar el cambio" : "Cambiar a este plan")}
        <p className={note}>Se cambia apenas se aprueba el pago; lo que queda de tu plan actual no se devuelve.</p>
      </div>
    );
  }

  const run = async (fn: typeof cancelSubscriptionAction, next: Partial<NonNullable<MyPlanState>>) => {
    setPending(true);
    setError(null);
    const res = await fn();
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    onStateChange({ ...state, ...next });
    router.refresh();
    return true;
  };

  if (state.cancelAtPeriodEnd) {
    return (
      <div>
        <button type="button" disabled={pending} onClick={() => run(resumeSubscriptionAction, { cancelAtPeriodEnd: false })} className={`${base} ${secondary} cursor-pointer disabled:opacity-60`}>
          Seguir suscripto
        </button>
        <p className={note}>Cancelada: tu plan sigue hasta el {until}.</p>
        {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setConfirm(true)} className={`${base} ${secondary} cursor-pointer`}>
        Cancelar suscripción
      </button>
      <p className={note}>Es tu plan actual. Se renueva el {until}.</p>
      <ConfirmDialog
        open={confirm}
        title="Cancelar suscripción"
        eyebrow="Suscripción"
        confirmLabel="Sí, cancelar"
        cancelLabel="Volver"
        danger
        pending={pending}
        error={error}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          if (await run(cancelSubscriptionAction, { cancelAtPeriodEnd: true })) setConfirm(false);
        }}
      >
        <p className="text-sm text-slate-600">
          No se te va a cobrar más. Tu plan <strong>{plan.name}</strong> sigue vigente hasta el {until}.
        </p>
      </ConfirmDialog>
    </div>
  );
}
