"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { applyAeroImportAction, checkAeroDataAction, rejectAeroImportAction } from "@/app/actions/aero-admin-actions";

const BUTTON = "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-4 text-sm font-bold disabled:opacity-60";

/** La lectura del MADHEL va por tandas: el botón las repite hasta terminar. */
export function AeroCheckButton({ dataset }: { dataset: "MADHEL" | "LAD" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setMessage("Leyendo la fuente…");
    try {
      for (;;) {
        const res = await checkAeroDataAction(dataset);
        if (!res.ok) {
          setMessage(res.error ?? "Falló la lectura. Sigue vigente la versión anterior.");
          break;
        }
        if (res.remaining === 0) {
          setMessage("Lectura terminada.");
          break;
        }
        setMessage(`Leyendo: faltan ${res.remaining} registros. Podés dejar esta página abierta.`);
      }
    } catch {
      setMessage("Se cortó la conexión. Volvé a tocar el botón para retomar.");
    } finally {
      setBusy(false);
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={busy} className={`${BUTTON} border border-[#001F58]/25 text-[#001F58] hover:bg-slate-50`}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Buscar actualización
      </button>
      {message && (
        <p role="status" className="max-w-xs text-right text-xs text-slate-600">
          {message}
        </p>
      )}
    </div>
  );
}

export function AeroReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: (id: string) => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setError(null);
    const res = await action(id);
    if (!res.ok) setError(res.error ?? "No se pudo completar.");
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={busy} onClick={() => act(applyAeroImportAction)} className={`${BUTTON} bg-[#001F58] text-white hover:bg-[#001331]`}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Aplicar
      </button>
      <button type="button" disabled={busy} onClick={() => act(rejectAeroImportAction)} className={`${BUTTON} border border-[#001F58]/25 text-[#001F58] hover:bg-slate-50`}>
        Descartar
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
