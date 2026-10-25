import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GUIDES_PATH } from "@/lib/guides";
import { getPublishedGuides } from "@/lib/guides-data";
import { DisplayTitle } from "@/components/ui/home/DisplayTitle";

// "Guías para comprar y vender" en la Home (VA-78). Server component: no suma JS de cliente.
// VA-143 (pedido del socio, 17/10): solo el título y el enlace a /guides, sin el índice de guías.
// Se muestra solo si hay al menos una guía publicada. Rediseño (25/10, v2): el enlace es una ficha de
// borde grueso, como las categorías de repuestos, que se rellena de blanco al pasar.
export async function GuidesSection() {
  const guides = await getPublishedGuides();
  if (guides.length === 0) return null;
  return (
    <section className="w-full py-16 sm:py-20" aria-labelledby="home-guides-title">
      <div className="container mx-auto px-4">
        <DisplayTitle id="home-guides-title" tone="dark">
          Guías para comprar y vender
        </DisplayTitle>
        <Link
          href={GUIDES_PATH}
          className="group relative mt-10 flex min-h-28 items-center justify-between gap-6 overflow-hidden border-2 border-white px-6 py-6 text-white transition-colors duration-300 hover:bg-white hover:text-[#00205B] focus-visible:bg-white focus-visible:text-[#00205B] sm:px-10"
        >
          <span className="font-heading text-xl leading-tight font-black uppercase tracking-[-0.01em] sm:text-3xl">Ver todas las guías</span>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#D62828] text-white sm:h-14 sm:w-14">
            <ArrowRight className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </span>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[#D62828] transition-transform duration-300 group-hover:scale-x-100" />
        </Link>
      </div>
    </section>
  );
}
