"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { republishAllAction, republishListingAction } from "@/app/actions/republish-actions";
import { refreshHeaderIndicators } from "@/lib/header-refresh";
import { dismissRepublishNotice, isRepublishNoticeDismissed } from "@/lib/republish-notice";
import type { RepublishView } from "@/lib/republish";

// VA-167: republicar desde "Mis publicaciones". Base y Pro: un botón por aviso activo, con el saldo del
// año. Broker y admins: "Republicar todas" cada N días. Arriba, un cartel cuando hay republicaciones
// disponibles (se cierra y vuelve cuando cambia el saldo).

const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
const dd = (iso: string) => DATE.format(new Date(iso));
const plural = (n: number) => `${n} republicaci${n === 1 ? "ón" : "ones"}`;

/** Cartel de arriba de "Mis publicaciones" (o el botón "Republicar todas" del Broker). */
export function RepublishNotice({ view, onChooseListings }: { view: RepublishView; onChooseListings: () => void }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const key = view.mode === "NONE" ? null : view.key;
  // localStorage solo existe en el navegador: se lee después de montar.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDismissed(isRepublishNoticeDismissed(key)), [key]);

  if (view.mode === "NONE") return null;

  if (view.mode === "ALL") {
    const run = async () => {
      setPending(true);
      setError(null);
      const res = await republishAllAction();
      setPending(false);
      if (!res.ok) return setError(res.error);
      setConfirm(false);
      setDone(`Listo: republicaste ${res.republished} aviso${res.republished === 1 ? "" : "s"}. Ya están primeros en Últimas publicaciones.`);
      router.refresh();
      refreshHeaderIndicators();
    };
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#001F58]/12 bg-white px-4 py-3 text-sm">
        <p className="text-slate-700">
          {done ??
            (view.availableAt
              ? `Podés volver a republicar el ${dd(view.availableAt)}.`
              : `Republicá todos tus avisos activos y volvé a ponerlos primeros en Últimas publicaciones (cada ${view.everyDays} días).`)}
        </p>
        <button
          type="button"
          disabled={!!view.availableAt || pending}
          onClick={() => setConfirm(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#001F58] px-4 text-sm font-bold text-white hover:bg-[#00133A] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Republicar todas
        </button>
        <ConfirmDialog
          open={confirm}
          title="Republicar todas"
          eyebrow="Mis publicaciones"
          confirmLabel="Republicar"
          cancelLabel="Volver"
          pending={pending}
          error={error}
          onClose={() => setConfirm(false)}
          onConfirm={run}
        >
          <p className="text-sm text-slate-600">
            Tus avisos activos vuelven a aparecer primeros en Últimas publicaciones. No cambia nada de los avisos. La próxima vez podés hacerlo en {view.everyDays} días.
          </p>
        </ConfirmDialog>
      </div>
    );
  }

  if (view.remaining <= 0 || dismissed) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#001F58]/12 bg-white px-4 py-3 text-sm">
      <p className="min-w-0 flex-1 border-l-2 border-[#E70F1F] pl-3 text-slate-700">
        Tenés <strong>{plural(view.remaining)}</strong> disponible{view.remaining === 1 ? "" : "s"}: volvé a poner tus avisos primero en Últimas publicaciones.
      </p>
      <button type="button" onClick={onChooseListings} className="min-h-10 rounded-md border border-[#001F58]/20 px-3 text-sm font-semibold text-[#001F58] hover:bg-slate-50 cursor-pointer">
        Elegir avisos
      </button>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => {
          dismissRepublishNotice(view.key);
          setDismissed(true);
        }}
        className="p-2 text-slate-400 hover:text-[#001F58] cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Botón "Republicar" de un aviso activo (Base y Pro). */
export function RepublishButton({ view, id, kind, className }: { view: RepublishView; id: string; kind: "AIRCRAFT" | "SPARE_PART"; className: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (view.mode !== "COUNT") return null;
  // Recién republicado: en lugar del botón, cuándo se puede repetir (VA-178).
  if (view.waiting[id]) return <span className="self-center text-[11px] text-slate-500">Republicado. Otra vez desde el {dd(view.waiting[id])}</span>;
  const left = view.remaining > 0 ? `Te ${view.remaining === 1 ? "queda" : "quedan"} ${plural(view.remaining)} hasta el ${dd(view.resetsAt)}` : `Se reponen el ${dd(view.resetsAt)}`;

  const run = async () => {
    setPending(true);
    setError(null);
    const res = await republishListingAction(kind, id);
    setPending(false);
    if (!res.ok) return setError(res.error);
    setConfirm(false);
    router.refresh();
    refreshHeaderIndicators();
  };

  return (
    <>
      <button type="button" disabled={view.remaining <= 0} title={left} onClick={() => setConfirm(true)} className={className}>
        <RefreshCw className="h-3 w-3" aria-hidden />
        Republicar
      </button>
      <ConfirmDialog
        open={confirm}
        title="Republicar este aviso"
        eyebrow="Mis publicaciones"
        confirmLabel="Republicar"
        cancelLabel="Volver"
        pending={pending}
        error={error}
        onClose={() => setConfirm(false)}
        onConfirm={run}
      >
        <p className="text-sm text-slate-600">
          Vuelve a aparecer primero en Últimas publicaciones. No cambia nada del aviso. {left}.
        </p>
      </ConfirmDialog>
    </>
  );
}
