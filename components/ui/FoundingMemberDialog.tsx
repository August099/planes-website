"use client";

import { useEffect, useRef } from "react";

// VA-182: ventana justo después del primer aviso de una cuenta fundadora. Al cerrarla sigue al aviso.
const DATE = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
const INCLUDES = [
  "Aviones y repuestos sin límite de avisos activos",
  "Insignia de usuario verificado",
  "Tus avisos primero en los listados y en la Home",
  "Página personalizada completa y detalle de avisos con tu marca",
  "Republicar todos tus avisos cada 30 días",
  "Métricas completas de tus avisos",
];

export function FoundingMemberDialog({ until, onClose }: { until: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="founder-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-[#00205B]/15 p-0 text-slate-800 backdrop:bg-[#001331]/60"
    >
      <div className="space-y-4 p-6">
        <p className="text-xs font-semibold text-[#D62828]">Miembro fundador</p>
        <h2 id="founder-title" className="text-xl font-bold text-[#00205B]">
          ¡Gracias por ser de los primeros!
        </h2>
        <p className="text-sm text-slate-700">
          Por ser de los primeros en apoyar a Ventas Aeronáuticas, tenés <strong className="text-[#00205B]">6 meses bonificados</strong>: te otorgamos una cuenta{" "}
          <strong className="text-[#00205B]">Broker / Empresa</strong> hasta el {DATE.format(new Date(until))}.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {INCLUDES.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">Al terminar, tu cuenta vuelve al plan Base. No se cobra nada.</p>
        <button type="button" onClick={onClose} className="min-h-11 w-full rounded-md bg-[#00205B] px-4 text-sm font-bold text-white hover:bg-[#001331] cursor-pointer">
          Ver mi aviso
        </button>
      </div>
    </dialog>
  );
}
