"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { requestWithdrawalAction, withdrawalPreviewAction } from "@/app/actions/withdrawal-actions";
import type { KeepOptions } from "@/lib/payments/withdrawal";
import type { KeepChoice } from "@/lib/quota";

const MONEY = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
const KIND_TEXT = { AIRCRAFT: "aviones", SPARE_PART: "repuestos" } as const;

// VA-125: botón de arrepentimiento de un pago de "Mis compras".
export function WithdrawalButton({ paymentId, until, description }: { paymentId: string; until: string; description: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // VA-150: qué se va a retirar (se pide al abrir el diálogo).
  const [detail, setDetail] = useState<{ amount: number; lines: string[]; keep: KeepOptions[] } | null>(null);
  // VA-181: qué avisos quedan activos. Arranca con los que quedarían si no elige (los más viejos).
  const [keep, setKeep] = useState<KeepChoice>({});
  const openDialog = async () => {
    setOpen(true);
    setDetail(null);
    setError(null);
    const res = await withdrawalPreviewAction(paymentId);
    if (!res.ok) return setError(res.error);
    setDetail({ amount: res.amount, lines: res.lines, keep: res.keep });
    setKeep(Object.fromEntries(res.keep.map((o) => [o.kind, o.listings.slice(-o.limit).map((l) => l.id)])));
  };
  const toggle = (o: KeepOptions, id: string) =>
    setKeep((k) => {
      const cur = k[o.kind] ?? [];
      if (cur.includes(id)) return { ...k, [o.kind]: cur.filter((x) => x !== id) };
      return cur.length >= o.limit ? k : { ...k, [o.kind]: [...cur, id] };
    });

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
          const res = await requestWithdrawalAction(paymentId, keep);
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
          {detail && detail.lines.length === 0 && <p className="text-slate-700">La suscripción termina en el momento.</p>}
          {detail?.keep.map((o) => {
            const chosen = keep[o.kind] ?? [];
            return (
              <fieldset key={o.kind} className="space-y-2 rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-sm font-semibold text-[#001F58]">¿Qué {KIND_TEXT[o.kind]} quedan activos?</legend>
                <p className="text-xs text-slate-500">
                  Con el plan Base quedan hasta {o.limit}. Elegidos: {chosen.length} de {o.limit}. Los demás se pausan y los podés activar después si liberás lugar.
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {o.listings.map((l) => (
                    <li key={l.id}>
                      <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={chosen.includes(l.id)}
                          disabled={!chosen.includes(l.id) && chosen.length >= o.limit}
                          onChange={() => toggle(o, l.id)}
                          className="h-4 w-4 shrink-0 accent-[#001F58]"
                        />
                        <span className="truncate">{l.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            );
          })}
          <p className="text-xs text-slate-500">Podés pedirlo hasta el {DATE.format(new Date(until))}.</p>
        </div>
      </ConfirmDialog>
    </>
  );
}
