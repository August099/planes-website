"use client";

import { useState } from "react";
import Link from "next/link";
import { updateFoundingLimitAction } from "@/app/actions/admin-users-actions";

// VA-182: "Fundadores: N de 15" con el límite editable.
export function FoundingLimitForm({ count, limit }: { count: number; limit: number }) {
  const [value, setValue] = useState(String(limit));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const res = await updateFoundingLimitAction(Number(value));
    setPending(false);
    setMessage(res.ok ? "Guardado." : res.error);
  };

  return (
    <form onSubmit={save} className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <Link href="/admin/users?plan=fundador" className="font-semibold text-[#001F58] underline">
        Fundadores: {count} de {limit}
      </Link>
      <label className="flex items-center gap-1">
        <span>Límite</span>
        <input type="number" min={0} max={1000} value={value} onChange={(e) => setValue(e.target.value)} className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" />
      </label>
      <button type="submit" disabled={pending || value === String(limit)} className="min-h-9 rounded-md border border-[#001F58]/20 px-3 text-xs font-semibold text-[#001F58] hover:bg-slate-50 disabled:opacity-40 cursor-pointer">
        Guardar
      </button>
      {message && <span className="text-xs" role="status">{message}</span>}
    </form>
  );
}
