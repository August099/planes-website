"use client";

import { useEffect, useRef, useState } from "react";

// Diálogo de confirmación (VA-80, mismo estilo que el de precios de VA-59): admin y perfil.
// Con `requireText`, el botón se habilita recién al escribir esa palabra.
export function ConfirmDialog({
  open,
  title,
  eyebrow = "Confirmar",
  children,
  confirmLabel,
  cancelLabel = "Cancelar",
  requireText,
  pending = false,
  error,
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  requireText?: string;
  pending?: boolean;
  error?: string | null;
  danger?: boolean;
  onConfirm: (typed: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const blocked = pending || (!!requireText && typed.trim() !== requireText);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        setTyped("");
        onClose();
      }}
      aria-label={title}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-[#001F58]/15 p-0 text-slate-800 backdrop:bg-[#001331]/60"
    >
      <div className="space-y-4 p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold text-[#001F58]">{title}</h2>
        </div>
        {children}
        {requireText && (
          <div className="space-y-2 border-l-2 border-[#E70F1F] pl-3">
            <p className="text-sm text-slate-700">
              Para seguir, escribí <strong>{requireText}</strong>.
            </p>
            <input
              aria-label={`Escribí ${requireText}`}
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              autoComplete="off"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tracking-wide"
            />
          </div>
        )}
        {error && <p className="text-xs font-medium text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            disabled={pending}
            className="rounded-md px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(typed)}
            disabled={blocked}
            className={`rounded-md px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer ${
              danger ? "bg-[#E70F1F] hover:bg-[#C20D1A]" : "bg-[#001F58] hover:bg-[#00133A]"
            }`}
          >
            {pending ? "Guardando…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
