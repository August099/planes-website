import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { GUIDES_PATH } from "@/lib/guides";
import { getPublishedGuides } from "@/lib/guides-data";
import { FlightPaths } from "@/components/ui/home/FlightPaths";

// "Guías para comprar y vender" en la Home (VA-78). Server component: no suma JS de cliente.
// VA-143 (pedido del socio, 17/10): solo el título y el enlace a /guides, sin el índice de guías.
// Se muestra solo si hay al menos una guía publicada. Rediseño (25/10, v2): el enlace es una ficha de
// borde grueso, como las categorías de repuestos, que se rellena de blanco al pasar.
export async function GuidesSection() {
  const guides = await getPublishedGuides();
  if (guides.length === 0) return null;
  return (
    // 26/10 (socio): sin título de sección; el banner solo, con "Guías de ayuda".
    <section className="w-full py-12 sm:py-16" aria-label="Guías de ayuda">
      <div className="container mx-auto px-4">
        {/* Moderno (26/10): banner redondeado con el degradé azul de la marca y rutas de vuelo animadas. */}
        <Link
          href={GUIDES_PATH}
          className="va-rise group relative isolate flex min-h-36 items-center justify-between gap-6 overflow-hidden rounded-[32px] bg-[linear-gradient(120deg,#0A4C96_0%,#00205B_70%)] px-7 py-8 text-white shadow-[0_30px_60px_-30px_rgb(10_76_150/0.9)] ring-1 ring-white/10 sm:px-12"
        >
          <FlightPaths id="va-route-guides" tone="dark" className="-z-10" />
          <span className="flex items-center gap-4 font-heading text-2xl leading-tight font-extrabold tracking-[-0.025em] sm:text-4xl">
            <BookOpen aria-hidden strokeWidth={2} className="h-8 w-8 shrink-0 text-white/70 sm:h-10 sm:w-10" />
            Guías de ayuda
          </span>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#00205B] shadow-lg transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16">
            <ArrowRight className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      </div>
    </section>
  );
}
