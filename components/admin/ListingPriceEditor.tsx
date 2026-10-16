"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ListingKind } from "@prisma/client";
import { updateListingPriceAction } from "@/app/actions/admin-prices-actions";
import {
  formatListingPrice,
  isLargePriceChange,
  LISTING_PRICE_MAX,
  priceChangePercent,
} from "@/lib/listing-price-format";

// VA-59: editar el precio de publicación. Siempre pasa por un diálogo de confirmación con el
// precio anterior, el nuevo y la variación; los cambios grandes piden escribir CONFIRMAR.
export function ListingPriceEditor({ kind, label, current }: { kind: ListingKind; label: string; current: number }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(String(current));
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<"closed" | "edit" | "confirm">("closed");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // El <dialog> nativo da foco atrapado, Escape y fondo inerte.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (step === "closed" && d.open) d.close();
    if (step !== "closed" && !d.open) d.showModal();
  }, [step]);

  const digits = value.replace(/\D/g, "");
  const next = digits === "" ? NaN : Number(digits);
  const valid = Number.isInteger(next) && next >= 0 && next <= LISTING_PRICE_MAX;
  const pct = valid ? priceChangePercent(current, next) : null;
  const large = valid && isLargePriceChange(current, next);

  const open = () => {
    setValue(String(current));
    setConfirmText("");
    setError(null);
    setStep("edit");
  };
  const close = () => setStep("closed");

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateListingPriceAction({ kind, amount: next, confirmText });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="self-start rounded-md border border-[#001F58]/20 px-4 py-2 text-xs font-semibold text-[#001F58] hover:bg-slate-50 cursor-pointer sm:self-auto"
      >
        Cambiar precio
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setStep("closed")}
        aria-labelledby={`price-title-${kind}`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-[#001F58]/15 p-0 text-slate-800 backdrop:bg-[#001331]/60"
      >
        <div className="space-y-5 p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {step === "confirm" ? "Confirmar cambio" : "Nuevo precio"}
            </p>
            <h2 id={`price-title-${kind}`} className="mt-1 text-lg font-bold text-[#001F58]">
              {label}
            </h2>
          </div>

          {step === "edit" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (valid && next !== current) setStep("confirm");
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor={`price-${kind}`} className="mb-1 block text-xs font-semibold text-slate-600">
                  Precio en pesos (0 = gratis)
                </label>
                <div className="flex items-center rounded-md border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-[#001F58]/30">
                  <span className="pl-3 text-sm text-slate-500">AR$</span>
                  <input
                    id={`price-${kind}`}
                    inputMode="numeric"
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-transparent px-2 py-2 text-sm tabular-nums outline-none"
                  />
                </div>
                {!valid && digits !== "" && (
                  <p className="mt-1 text-xs text-red-700">
                    Hasta AR$ {LISTING_PRICE_MAX.toLocaleString("es-AR")}.
                  </p>
                )}
                {valid && next === current && <p className="mt-1 text-xs text-slate-500">Es el precio vigente.</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={close} className="rounded-md px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!valid || next === current}
                  className="rounded-md bg-[#001F58] px-4 py-2 text-xs font-bold text-white hover:bg-[#00133A] disabled:opacity-50 cursor-pointer"
                >
                  Continuar
                </button>
              </div>
            </form>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <dl className="grid grid-cols-3 divide-x divide-[#001F58]/10 rounded-md border border-[#001F58]/12 text-center tabular-nums">
                <div className="p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Antes</dt>
                  <dd className="mt-1 text-sm text-slate-600">{formatListingPrice(current)}</dd>
                </div>
                <div className="p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Después</dt>
                  <dd className="mt-1 text-sm font-bold text-[#001F58]">{formatListingPrice(next)}</dd>
                </div>
                <div className="p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Variación</dt>
                  <dd className={`mt-1 text-sm font-semibold ${large ? "text-[#C20D1A]" : "text-slate-700"}`}>
                    {pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")} %`}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-slate-600">Vale para las compras nuevas; las que ya están en curso mantienen su precio.</p>

              {large && (
                <div className="space-y-2 border-l-2 border-[#E70F1F] pl-3">
                  <p className="text-sm text-slate-700">
                    {next === 0 ? "Publicar pasaría a ser gratis." : "Es un cambio de más del 50 %."} Para guardarlo, escribí{" "}
                    <strong>CONFIRMAR</strong>.
                  </p>
                  <input
                    aria-label="Escribí CONFIRMAR"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    autoComplete="off"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tracking-wide"
                  />
                </div>
              )}

              {error && <p className="text-xs font-medium text-red-700">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStep("edit")}
                  disabled={pending}
                  className="rounded-md px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={pending || (large && confirmText.trim() !== "CONFIRMAR")}
                  className="rounded-md bg-[#E70F1F] px-4 py-2 text-xs font-bold text-white hover:bg-[#C20D1A] disabled:opacity-50 cursor-pointer"
                >
                  {pending ? "Guardando…" : "Guardar precio"}
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
