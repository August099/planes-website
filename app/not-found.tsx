import Link from "next/link";
import { BackOrHomeButton } from "@/components/ui/BackOrHomeButton";
import { PageBackground } from "@/components/ui/PageBackground";

export default function NotFound() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen flex items-center justify-center px-4">
      <PageBackground page="plans" />

      <div className="max-w-xl w-full bg-white border border-[#00205B]/12 rounded-lg p-8 sm:p-10 shadow-sm my-12">
        <div className="mb-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D62828]">
          Señal de Radar Perdida
        </div>

        <h1 className="va-h1-keep font-heading text-7xl sm:text-8xl font-black text-[#00205B] tracking-tight mb-2">
          4<span className="text-[#D62828]">0</span>4
        </h1>

        <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#00205B] mb-4">
          ¡Atención piloto! Esta ruta no figura en el plan de vuelo.
        </h2>

        <p className="text-sm sm:text-base text-[#00205B]/70 leading-relaxed mb-8">
          La coordenada o página que buscas fue movida, reasignada o se encuentra fuera del espacio aéreo de la plataforma.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-[#00205B] hover:bg-[#00205B]/90 text-white font-medium text-sm transition-all shadow-md active:scale-[0.98]"
          >
            Inicio
          </Link>

          {/* VA-163 */}
          <BackOrHomeButton className="w-full sm:w-auto px-6 py-3 rounded-md bg-white/80 hover:bg-white border border-[#00205B]/20 text-[#00205B] font-medium text-sm transition-all shadow-sm" />
        </div>
      </div>
    </main>
  );
}