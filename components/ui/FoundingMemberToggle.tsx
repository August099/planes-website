"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award } from "lucide-react";
import { setFoundingMemberAction } from "@/app/actions/admin-users-actions";

// Botón del panel admin para dar o quitar "Miembro fundador" (VA-58).
export function FoundingMemberToggle({ userId, isFounding }: { userId: string; isFounding: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const res = await setFoundingMemberAction(userId, !isFounding);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
          isFounding
            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
            : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Award className="w-3.5 h-3.5" />
        {pending ? "Guardando..." : isFounding ? "Fundador · Quitar" : "Hacer fundador"}
      </button>
      {error && <p className="max-w-56 text-xs text-red-600">{error}</p>}
    </div>
  );
}
