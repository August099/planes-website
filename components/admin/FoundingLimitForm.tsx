"use client";

import { useState } from "react";
import Link from "next/link";
import { updateFoundingLimitAction } from "@/app/actions/admin-users-actions";
import { BUSINESS_SIGNUP_NOTICE_TO } from "@/lib/business-signup-notice-to";

// VA-182: "Fundadores: N" (lista). 28/10 (socio): la bonificación es manual; el número que antes era el límite
// automático ahora es el interruptor del mail por cada cuenta de empresa nueva (> 0 = prendido).
export function FoundingLimitForm({ count, limit }: { count: number; limit: number }) {
  const [on, setOn] = useState(limit > 0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = async () => {
    setPending(true);
    setMessage(null);
    const res = await updateFoundingLimitAction(on ? 0 : 15);
    setPending(false);
    if (res.ok) setOn(!on);
    setMessage(res.ok ? "Guardado." : res.error);
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
      <Link href="/admin/users?plan=fundador" className="font-semibold text-[#001F58] underline">
        Fundadores: {count}
      </Link>
      <span className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Avisar por mail las cuentas de empresa nuevas"
          disabled={pending}
          onClick={toggle}
          className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 cursor-pointer ${on ? "bg-emerald-600" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
        </button>
        <span>
          Mail a {BUSINESS_SIGNUP_NOTICE_TO} por cada cuenta de empresa nueva: <strong>{on ? "prendido" : "pausado"}</strong>
        </span>
      </span>
      {message && <span className="text-xs" role="status">{message}</span>}
    </div>
  );
}
