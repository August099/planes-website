"use client";

import Link from "next/link";
import { Repeat, Plane } from "lucide-react";
import { PageBackground } from "@/components/ui/PageBackground";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="relative isolate overflow-hidden min-h-screen flex items-center justify-center px-4">
      <PageBackground page="plans" />

      <div className="max-w-xl w-full bg-white border border-[#00205B]/12 rounded-lg p-8 sm:p-10 shadow-sm my-12">
        <div className="mb-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D62828]">
          Falla en Instrumental
        </div>

        <h1 className="va-h1-keep font-heading text-7xl sm:text-8xl font-black text-[#00205B] tracking-tight mb-2">
          5<span className="text-[#D62828]">0</span>0
        </h1>

        <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#00205B] mb-4">
          ¡Turbulencia detectada en el servidor!
        </h2>

        <p className="text-sm sm:text-base text-[#00205B]/70 leading-relaxed mb-8">
          Surgió un inconveniente técnico inesperado procesando tu solicitud. Nuestro equipo de mantenimiento ya fue notificado.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#00205B] hover:bg-[#00205B]/90 text-white font-medium text-sm transition-all shadow-md active:scale-[0.98]"
          >
            <Repeat className="w-4 h-4" />
            <span>Reintentar</span>
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-md bg-white/80 hover:bg-white border border-[#00205B]/20 text-[#00205B] font-medium text-sm transition-all shadow-sm"
          >
            <Plane className="w-4 h-4" />
            <span>Volver a la base</span>
          </Link>
        </div>
      </div>
    </main>
  );
}