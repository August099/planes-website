"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRenewalPercentAction } from "@/app/actions/admin-prices-actions";

// VA-105 (14/10): porcentaje del precio suelto que cuesta renovar un aviso vencido.
export function RenewalPercentEditor({ current }: { current: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(current));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateRenewalPercentAction(Number(value));
      setMessage(res.ok ? { ok: true, text: "Guardado." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="renewal-percent" className="block text-xs font-semibold text-[#001F58]">
          Porcentaje
        </label>
        <div className="mt-1 flex items-center gap-1">
          <input
            id="renewal-percent"
            type="number"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-10 w-24 rounded-md border border-[#001F58]/20 px-3 text-sm tabular-nums focus:border-[#001F58] focus:outline-none"
          />
          <span className="text-sm text-slate-600">%</span>
        </div>
      </div>
      <button
        type="submit"
        disabled={pending || Number(value) === current}
        className="min-h-10 rounded-md bg-[#001F58] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00133A] disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {message && <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>}
    </form>
  );
}
