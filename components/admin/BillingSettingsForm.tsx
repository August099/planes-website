"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discardInvoiceAction, retryInvoiceAction, saveBillingSettingsAction } from "@/app/actions/admin-payments-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// VA-92: configuración de facturación en "Pagos y facturas".

type Values = {
  monotributoAnnualCap: number | null;
  alertThresholdPercent: number;
  dniRequiredFrom: number;
  graceDays: number;
  maxInvoiceAttempts: number;
};

const LABEL = "mb-1 block text-xs font-semibold text-slate-600";
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums";

export function BillingSettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [v, setV] = useState({
    monotributoAnnualCap: initial.monotributoAnnualCap == null ? "" : String(initial.monotributoAnnualCap),
    alertThresholdPercent: String(initial.alertThresholdPercent),
    dniRequiredFrom: String(initial.dniRequiredFrom),
    graceDays: String(initial.graceDays),
    maxInvoiceAttempts: String(initial.maxInvoiceAttempts),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const field = (key: keyof typeof v, label: string, hint?: string) => (
    <div>
      <label htmlFor={`bs-${key}`} className={LABEL}>
        {label}
      </label>
      <input
        id={`bs-${key}`}
        inputMode="numeric"
        className={INPUT}
        value={v[key]}
        onChange={(e) => setV((p) => ({ ...p, [key]: e.target.value.replace(/[^\d]/g, "") }))}
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {errors[key] && <p className="mt-1 text-xs text-red-700">{errors[key]}</p>}
    </div>
  );

  const save = () =>
    start(async () => {
      setMessage(null);
      const res = await saveBillingSettingsAction({ ...v, monotributoAnnualCap: v.monotributoAnnualCap === "" ? null : v.monotributoAnnualCap });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.error);
        return;
      }
      setErrors({});
      setMessage("Guardado.");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {field("monotributoAnnualCap", "Tope anual de tu categoría (AR$)", "Solo indicador: no bloquea nada.")}
        {field("alertThresholdPercent", "Alerta al llegar al (%)", "Se avisa por mail al admin.")}
        {field("dniRequiredFrom", "DNI obligatorio desde (AR$)", "Consumidor final, según ARCA.")}
        {field("graceDays", "Días de gracia", "Tras un cobro rechazado de una suscripción.")}
        {field("maxInvoiceAttempts", "Reintentos de factura", "Después se avisa al admin.")}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex min-h-10 items-center rounded-md bg-[#001F58] px-4 text-xs font-bold text-white hover:bg-[#00133A] disabled:opacity-50 cursor-pointer"
        >
          Guardar
        </button>
        {message && <p className={`text-xs ${Object.keys(errors).length ? "text-red-700" : "text-emerald-700"}`}>{message}</p>}
      </div>
    </div>
  );
}

export function RetryInvoiceButton({ invoiceId, label = "Reintentar factura" }: { invoiceId: string; label?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await retryInvoiceAction(invoiceId);
            if (!res.ok) return setError(res.error);
            router.refresh();
          })
        }
        className="rounded-md border border-[#001F58]/20 px-3 py-1.5 text-xs font-semibold text-[#001F58] hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
      >
        {label}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}

// VA-105 · 1.1: descartar una factura de una prueba interna (nunca se emite).
export function DiscardInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
      >
        Descartar (prueba interna)
      </button>
      <ConfirmDialog
        open={open}
        eyebrow="Factura"
        title="Descartar esta factura"
        confirmLabel="Descartar"
        requireText="DESCARTAR"
        danger
        pending={pending}
        error={error}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        onConfirm={(typed) =>
          start(async () => {
            const res = await discardInvoiceAction(invoiceId, typed);
            if (!res.ok) return setError(res.error);
            setOpen(false);
            router.refresh();
          })
        }
      >
        <p className="text-sm text-slate-600">Queda descartada y nunca se emite. Usalo solo para pagos de prueba interna (por ejemplo, el pago real que se hace a mano antes del lanzamiento).</p>
      </ConfirmDialog>
    </>
  );
}
