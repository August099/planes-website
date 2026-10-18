"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFreeQuotaAction } from "@/app/actions/admin-plans-actions";

// VA-152: cupo del plan Gratis en /admin/plans. Cambiarlo no pausa avisos: quien quede por encima no
// puede publicar ni activar otro hasta estar dentro del cupo.
const LABEL = "mb-1 block text-xs font-semibold text-slate-600";
const INPUT = "w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums";

export function FreeQuotaForm({ aircraft, parts }: { aircraft: number; parts: number }) {
  const router = useRouter();
  const [a, setA] = useState(String(aircraft));
  const [p, setP] = useState(String(parts));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = a !== String(aircraft) || p !== String(parts);

  return (
    <form
      className="flex flex-wrap items-end gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        startTransition(async () => {
          const res = await saveFreeQuotaAction({ aircraft: a, parts: p });
          setMsg(res.ok ? { ok: true, text: "Guardado." } : { ok: false, text: res.error });
          if (res.ok) router.refresh();
        });
      }}
    >
      <div>
        <label htmlFor="free-aircraft" className={LABEL}>Aviones activos</label>
        <input id="free-aircraft" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} className={INPUT} />
      </div>
      <div>
        <label htmlFor="free-parts" className={LABEL}>Repuestos activos</label>
        <input id="free-parts" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value.replace(/\D/g, ""))} className={INPUT} />
      </div>
      <button
        type="submit"
        disabled={pending || !changed}
        className="inline-flex min-h-10 items-center rounded-md bg-[#001F58] px-4 text-xs font-bold text-white hover:bg-[#00133A] disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {msg && <p className={`text-xs font-medium ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}
