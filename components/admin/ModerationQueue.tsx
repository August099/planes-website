"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveReviewAction } from "@/app/actions/moderation-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ModerationHistory } from "@/components/admin/ModerationHistory";
import type { PendingReview } from "@/lib/moderation";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

// VA-154: "Revisiones pendientes": avisos pausados por moderación que el dueño editó y mandó a revisar.
// "Reactivar" lo vuelve a activo si el dueño tiene cupo (si no, queda pausado común); "Mantener
// pausado" pide un mensaje nuevo. Las dos le mandan un mail y una ventana al dueño.
export function ModerationQueue({ items }: { items: PendingReview[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<{ item: PendingReview; decision: "REACTIVATE" | "KEEP_PAUSED" } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    if (!open) return;
    setPending(true);
    setError(null);
    const res = await resolveReviewAction({ kind: open.item.kind, id: open.item.id, decision: open.decision, message });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOpen(null);
    router.refresh();
  };

  return (
    <section className="space-y-3 rounded-lg border border-[#001F58]/12 bg-white p-5">
      <div>
        <p className={LABEL}>Moderación</p>
        <h2 className="mt-1 text-lg font-bold text-[#001F58]">Revisiones pendientes ({items.length})</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No hay avisos esperando revisión.</p>
      ) : (
        <ul className="divide-y divide-[#001F58]/10">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-1">
                <a href={item.href} target="_blank" rel="noreferrer" className="font-semibold text-[#001F58] hover:underline">
                  {item.title}
                </a>
                <p className="text-xs text-slate-500">
                  {item.kind === "AIRCRAFT" ? "Aeronave" : "Repuesto"} · {item.owner.name ?? item.owner.email} · pidió revisión el{" "}
                  <span className="tabular-nums">{DATE.format(new Date(item.requestedAt))}</span>
                </p>
                <ModerationHistory items={item.history} />
              </div>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen({ item, decision: "REACTIVATE" });
                    setMessage("");
                    setError(null);
                  }}
                  className="min-h-10 rounded-md bg-[#001F58] px-4 text-xs font-bold text-white hover:bg-[#00133A] cursor-pointer"
                >
                  Reactivar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen({ item, decision: "KEEP_PAUSED" });
                    setMessage("");
                    setError(null);
                  }}
                  className="min-h-10 rounded-md border border-[#001F58]/20 px-4 text-xs font-semibold text-[#001F58] hover:border-[#001F58] cursor-pointer"
                >
                  Mantener pausado
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!open}
        eyebrow="Revisión"
        title={open?.decision === "REACTIVATE" ? "Reactivar aviso" : "Mantener pausado"}
        confirmLabel={open?.decision === "REACTIVATE" ? "Reactivar" : "Mantener pausado"}
        danger={open?.decision === "KEEP_PAUSED"}
        pending={pending}
        error={error}
        onConfirm={() => void confirm()}
        onClose={() => setOpen(null)}
      >
        <p className="text-sm text-slate-600">
          {open?.decision === "REACTIVATE"
            ? "Vuelve a estar activo si el dueño tiene cupo libre; si no, queda pausado y lo activa él cuando tenga lugar."
            : "Sigue sin verse. El dueño recibe tu mensaje y puede volver a editarlo y pedir revisión."}
        </p>
        <label className="mt-3 block text-left">
          <span className="mb-1 block text-xs font-semibold text-slate-600">
            {open?.decision === "REACTIVATE" ? "Mensaje para el dueño (opcional)" : "Mensaje para el dueño"}
          </span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
      </ConfirmDialog>
    </section>
  );
}
