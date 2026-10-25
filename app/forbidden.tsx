import Link from "next/link";
import { BackOrHomeButton } from "@/components/ui/BackOrHomeButton";
import { PageBackground } from "@/components/ui/PageBackground";

export default function Forbidden() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen flex items-center justify-center px-4">
      <PageBackground page="plans" />

      <div className="max-w-xl w-full bg-white border border-[#001F58]/12 rounded-lg p-8 sm:p-10 shadow-sm my-12">
        <div className="mb-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E70F1F]">
          Espacio Aéreo Restringido
        </div>

        <h1 className="font-heading text-7xl sm:text-8xl font-black text-[#001F58] tracking-tight mb-2">
          4<span className="text-[#E70F1F]">0</span>3
        </h1>

        <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#001F58] mb-4">
          ¡Permiso denegado!
        </h2>

        <p className="text-sm sm:text-base text-[#001F58]/70 leading-relaxed mb-8">
          No tenés los permisos necesarios para entrar a esta sección de la plataforma.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-[#001F58] hover:bg-[#001F58]/90 text-white font-medium text-sm transition-all shadow-md active:scale-[0.98]"
          >
            Inicio
          </Link>

          {/* VA-163 */}
          <BackOrHomeButton className="w-full sm:w-auto px-6 py-3 rounded-md bg-white/80 hover:bg-white border border-[#001F58]/20 text-[#001F58] font-medium text-sm transition-all shadow-sm" />
        </div>
      </div>
    </main>
  );
}