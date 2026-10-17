"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { requestWithdrawalAction, withdrawalPreviewAction } from "@/app/actions/withdrawal-actions";

const MONEY = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

// VA-125: botón de arrepentimiento de un pago de "Mis compras".
export function WithdrawalButton({ paymentId, until, description }: { paymentId: string; until: string; description: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // VA-150: qué se va a retirar (se pide al abrir el diálogo).
  const [detail, setDetail] = useState<{ amount: number; lines: string[] } | null>(null);
  const openDialog = async () => {
    setOpen(true);
    setDetail(null);
    const res = await withdrawalPreviewAction(paymentId);
    if (res.ok) setDetail({ amount: res.amount, lines: res.lines });
    else setError(res.error);
  };

  if (done) return <span className="text-xs font-semibold text-slate-600">Devolución pedida</span>;

  return (
    <>
      <button type="button" onClick={openDialog} className="text-xs font-semibold text-[#E70F1F] hover:underline cursor-pointer">
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
        <div className="space-y-2 text-left text-sm text-slate-600">
          <p>
            <strong className="text-[#001F58]">{description}</strong>
          </p>
          <p>
            {detail ? <>Se devuelven <strong className="text-[#001F58]">AR$ {MONEY.format(detail.amount)}</strong></> : "Te devolvemos el total"} por Mercado Pago
            (puede tardar unos días en verse según el medio de pago) y se retira lo que obtuviste con este pago, aunque ya lo hayas usado:
          </p>
          {!detail && !error && <p className="text-xs text-slate-500">Armando el detalle…</p>}
          {detail && detail.lines.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-slate-700">
              {detail.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
          {detail && detail.lines.length === 0 && <p className="text-slate-700">No hay avisos ni saldo para retirar.</p>}
          <p className="text-xs text-slate-500">Podés pedirlo hasta el {DATE.format(new Date(until))}.</p>
        </div>
      </ConfirmDialog>
    </>
  );
}
