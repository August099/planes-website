"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { saveSaleAnswerAction } from "@/app/actions/sale-actions";

// VA-183: al marcar "Vendido". El aviso ya quedó vendido; si cierra sin responder, la respuesta queda vacía.
export function SoldDialog({ kind, id, currency, onClose }: { kind: "AIRCRAFT" | "SPARE_PART"; id: string; currency: "USD" | "ARS"; onClose: () => void }) {
  const [viaVA, setViaVA] = useState<boolean | null>(null);
  const [price, setPrice] = useState("");
  const [cur, setCur] = useState(currency);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const amount = price.trim() ? Number(price.replace(/\./g, "").replace(",", ".")) : null;
    if (viaVA === null && amount === null) return onClose();
    setPending(true);
    setError(null);
    const res = await saveSaleAnswerAction(kind, id, { viaVA, price: amount, currency: cur });
    setPending(false);
    if (!res.ok) return setError(res.error);
    onClose();
  };

  const choice = (value: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={viaVA === value}
      onClick={() => setViaVA(value)}
      className={`min-h-11 flex-1 rounded-md border text-sm font-semibold cursor-pointer ${viaVA === value ? "border-[#001F58] bg-[#001F58] text-white" : "border-[#001F58]/20 text-[#001F58] hover:bg-slate-50"}`}
    >
      {label}
    </button>
  );

  return (
    <ConfirmDialog open eyebrow="Aviso vendido" title="¿Lo vendiste gracias a un contacto de Ventas Aeronáuticas?" confirmLabel="Guardar" cancelLabel="Ahora no" pending={pending} error={error} onClose={onClose} onConfirm={save}>
      <div className="space-y-4 text-left text-sm text-slate-600">
        <div className="flex gap-2">
          {choice(true, "Sí")}
          {choice(false, "No")}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">¿Por cuánto lo vendiste? (opcional)</span>
          <span className="flex gap-2">
            <select aria-label="Moneda" value={cur} onChange={(e) => setCur(e.target.value as "USD" | "ARS")} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm">
              <option value="USD">US$</option>
              <option value="ARS">AR$</option>
            </select>
            <input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
          </span>
        </label>
        <p className="text-xs text-slate-500">Es para nuestras estadísticas: no se muestra en el aviso.</p>
      </div>
    </ConfirmDialog>
  );
}
