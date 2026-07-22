import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen flex items-center justify-center -mb-16 px-4">
      <Image
        src="/bkg-plans.jpg"
        alt="Fondo 404"
        fill
        priority
        className="-z-20 object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-background/80 backdrop-blur-md" />

      <div className="max-w-xl w-full text-center bg-white/70 backdrop-blur-md border border-[#001F58]/15 rounded-3xl p-8 sm:p-12 shadow-xl my-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E70F1F]/10 border border-[#E70F1F]/20 text-[#E70F1F] text-xs font-semibold tracking-wider uppercase mb-6 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-[#E70F1F]"></span>
          Señal de Radar Perdida
        </div>

        <h1 className="font-heading text-7xl sm:text-8xl font-black text-[#001F58] tracking-tight mb-2">
          4<span className="text-[#E70F1F]">0</span>4
        </h1>

        <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#001F58] mb-4">
          ¡Atención piloto! Esta ruta no figura en el plan de vuelo.
        </h2>

        <p className="text-sm sm:text-base text-[#001F58]/70 leading-relaxed mb-8">
          La coordenada o página que buscas fue movida, reasignada o se encuentra fuera del espacio aéreo de la plataforma.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#001F58] hover:bg-[#001F58]/90 text-white font-medium text-sm transition-all shadow-md active:scale-[0.98]"
          >
            ✈️ Volver a la Base (Inicio)
          </Link>

          <Link
            href="/planes"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/80 hover:bg-white border border-[#001F58]/20 text-[#001F58] font-medium text-sm transition-all shadow-sm"
          >
            Ver Catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}