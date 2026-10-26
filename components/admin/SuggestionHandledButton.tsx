"use client";

import { useTransition } from "react";
import { toggleSuggestionHandledAction } from "@/app/actions/admin-suggestions-actions";

export function SuggestionHandledButton({ id, handled }: { id: string; handled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => void toggleSuggestionHandledAction(id, !handled))}
      className="rounded-md border border-[#001F58]/20 px-3 py-1.5 text-xs font-semibold text-[#001F58] hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
    >
      {handled ? "Volver a pendiente" : "Marcar leída"}
    </button>
  );
}
