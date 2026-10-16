"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { requestWithdrawalAction } from "@/app/actions/withdrawal-actions";

const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

// VA-125: botón de arrepentimiento de un pago de "Mis compras".
export function WithdrawalButton({ paymentId, until, description }: { paymentId: string; until: string; description: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs font-semibold text-slate-600">Devolución pedida</span>;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-[#E70F1F] hover:underline cursor-pointer">
        Arrepentirme
      </button>
      <ConfirmDialog
        open={open}
        eyebrow="Botón de arrepentimiento"
        title="¿Querés la devolución de este pago?"
        confirmLabel="Sí, quiero la devolución"
        cancelLabel="Volver"
        danger
        pending={pending}
        error={error}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setPending(true);
          setError(null);
          const res = await requestWithdrawalAction(paymentId);
          setPending(false);
          if (!res.ok) return setError(res.error);
          setDone(true);
          setOpen(false);
          router.refresh();
        }}
      >
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            <strong className="text-[#001F58]">{description}</strong>
          </p>
          <p>
            Te devolvemos el total por Mercado Pago (puede tardar unos días en verse según el medio de pago) y se da de baja lo que compraste:
            los avisos pagados con esta compra, el saldo o la suscripción.
          </p>
          <p className="text-xs text-slate-500">Podés pedirlo hasta el {DATE.format(new Date(until))}.</p>
        </div>
      </ConfirmDialog>
    </>
  );
}
