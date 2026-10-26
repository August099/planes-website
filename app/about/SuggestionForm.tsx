"use client";

import { useActionState } from "react";
import { submitSuggestionAction, type SuggestionState } from "@/app/actions/suggestion-actions";

const LABEL = "text-xs font-semibold text-slate-600";
const FIELD = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

// VA-122: formulario de sugerencias. Nombre y email son opcionales (para poder responder).
export function SuggestionForm() {
  const [state, action, pending] = useActionState<SuggestionState, FormData>(submitSuggestionAction, { status: "idle" });

  if (state.status === "sent") {
    return (
      <p role="status" className="border-l-2 border-[#00205B] pl-3 text-sm text-slate-700">
        <strong className="text-[#00205B]">¡Gracias!</strong> Recibimos tu sugerencia. La leemos con el equipo y, si dejaste tu email,
        te respondemos.
      </p>
    );
  }

  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="sg-message" className={LABEL}>
          Tu sugerencia *
        </label>
        <textarea id="sg-message" name="message" rows={5} required maxLength={2000} className={FIELD} placeholder="¿Qué te gustaría que mejoremos o sumemos?" />
        {err.message && <p className="mt-1 text-xs text-red-700">{err.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sg-name" className={LABEL}>
            Nombre (opcional)
          </label>
          <input id="sg-name" name="name" maxLength={100} autoComplete="name" className={FIELD} />
          {err.name && <p className="mt-1 text-xs text-red-700">{err.name}</p>}
        </div>
        <div>
          <label htmlFor="sg-email" className={LABEL}>
            Email (opcional, para responderte)
          </label>
          <input id="sg-email" name="email" type="email" autoComplete="email" className={FIELD} />
          {err.email && <p className="mt-1 text-xs text-red-700">{err.email}</p>}
        </div>
      </div>
      {/* Campo trampa para bots: oculto para las personas. */}
      <div aria-hidden className="hidden">
        <label htmlFor="sg-website">No completar</label>
        <input id="sg-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state.status === "error" && state.message && <p className="text-xs font-medium text-red-700">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#001331] disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Enviando…" : "Enviar sugerencia"}
      </button>
    </form>
  );
}
