"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { grantCourtesyPlanAction, revokeCourtesyPlanAction } from "@/app/actions/admin-users-actions";

// VA-92: columna "Plan" de /admin/users. Muestra la suscripción del usuario y permite asignar un
// plan de cortesía (manual, sin cobro) hasta una fecha, o quitarlo.

export type CourtesyPlanOption = { id: string; name: string };
export type UserSubscriptionInfo = {
  planName: string;
  source: "MERCADOPAGO" | "MANUAL";
  active: boolean;
  until: string; // ISO
} | null;

const DATE = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" });

function inOneYear() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function CourtesyPlanControl({ userId, userName, subscription, plans }: { userId: string; userName: string; subscription: UserSubscriptionInfo; plans: CourtesyPlanOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<"grant" | "revoke" | null>(null);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [until, setUntil] = useState(inOneYear());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const close = () => {
    setOpen(null);
    setError(null);
  };
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error);
      close();
      router.refresh();
    });

  const paidActive = subscription?.active && subscription.source === "MERCADOPAGO";

  return (
    <div className="min-w-44 text-xs">
      {subscription ? (
        <p className={subscription.active ? "text-slate-800" : "text-slate-400 line-through"}>
          <span className="font-semibold">{subscription.planName}</span>
          {subscription.source === "MANUAL" && <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">Cortesía</span>}
          <span className="block text-slate-500">hasta {DATE.format(new Date(subscription.until))}</span>
        </p>
      ) : (
        <p className="text-slate-400">Sin plan</p>
      )}
      <div className="mt-1 flex flex-wrap gap-x-3">
        {!paidActive && plans.length > 0 && (
          <button type="button" onClick={() => setOpen("grant")} className="font-semibold text-[#001F58] hover:underline cursor-pointer">
            Asignar plan de cortesía
          </button>
        )}
        {subscription?.source === "MANUAL" && subscription.active && (
          <button type="button" onClick={() => setOpen("revoke")} className="font-semibold text-red-700 hover:underline cursor-pointer">
            Quitar
          </button>
        )}
      </div>

      <ConfirmDialog
        open={open === "grant"}
        eyebrow="Plan de cortesía"
        title={`Asignar un plan a ${userName}`}
        confirmLabel="Asignar"
        pending={pending}
        error={error}
        onClose={close}
        onConfirm={() => run(() => grantCourtesyPlanAction({ userId, planId, until, note }))}
      >
        <p className="text-sm text-slate-600">Sin cobro ni renovación: no cuenta en ingresos. Al vencer, vuelve al cupo Gratis y, si tiene más avisos activos, se pausan los más nuevos.</p>
        <div className="mt-4 space-y-3 text-left">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Plan</span>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Vence el</span>
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Nota (opcional)</span>
            <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: socio, canje" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "revoke"}
        eyebrow="Plan de cortesía"
        title={`Quitar el plan de ${userName}`}
        confirmLabel="Quitar"
        danger
        pending={pending}
        error={error}
        onClose={close}
        onConfirm={() => run(() => revokeCourtesyPlanAction(userId))}
      >
        <p className="text-sm text-slate-600">Pierde los beneficios desde ahora. Sus avisos y datos no se borran.</p>
      </ConfirmDialog>
    </div>
  );
}
