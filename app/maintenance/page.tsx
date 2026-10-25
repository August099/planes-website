import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";

export default function MaintenancePage() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen flex items-center justify-center px-4">
      <PageBackground page="plans" />

      <div className="max-w-xl w-full bg-white border border-[#00205B]/12 rounded-lg p-8 sm:p-10 shadow-sm my-12">
        <div className="mb-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00205B]">
          Trabajos en Hangar
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-black text-[#00205B] tracking-tight mb-2 break-words">
          MAN<span className="text-[#D62828]">TENIMIENTO</span>
        </h1>

        <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#00205B] mb-4">
          Estamos afinando los motores
        </h2>

        <p className="text-sm sm:text-base text-[#00205B]/70 leading-relaxed mb-8">
          Estamos haciendo una revisión técnica programada. Volvemos en unos minutos.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-[#00205B] hover:bg-[#00205B]/90 text-white font-medium text-sm transition-all shadow-md active:scale-[0.98]"
          >
            Actualizar
          </Link>
        </div>
      </div>
    </main>
  );
}