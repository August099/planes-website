import { Plane } from "lucide-react";
import { DisplayTitle } from "@/components/ui/home/DisplayTitle";

const STEPS = [
  {
    title: "Publicá tu avión",
    description: "Cargá fotos, precio y detalles en pocos minutos.",
  },
  {
    title: "Recibí contactos",
    description: "Compradores interesados te escriben directo, sin intermediarios.",
  },
  {
    title: "Cerrá la venta",
    description: "Coordiná la operación vos mismo, a tu manera.",
  },
];

// VA-85: los tres pasos como una ruta. Rediseño (25/10, v2): números calados gigantes en columnas
// separadas por filetes, y un avión que recorre la ruta con el scroll (la estela roja es el tramo hecho;
// sin animación queda quieto al comienzo).
export function HowItWorks() {
  return (
    <section className="w-full py-20 text-white">
      <div className="container mx-auto px-4">
        <DisplayTitle tone="dark">Cómo funciona</DisplayTitle>

        <div aria-hidden className="relative mt-12 hidden h-6 overflow-hidden md:block">
          <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/35" />
          <span className="va-flight absolute inset-0 flex items-center">
            <span className="h-0.5 flex-1 bg-[#D62828]" />
            <Plane className="h-5 w-5 shrink-0 rotate-45 fill-white text-white" />
          </span>
        </div>

        <ol className="mt-8 grid border-t border-white/15 md:mt-6 md:grid-cols-3 md:border-t-0">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="border-b border-white/15 py-8 md:border-b-0 md:border-l md:px-8 md:py-2 md:first:border-l-0 md:first:pl-0"
            >
              <span
                aria-hidden
                className="block font-heading text-[5rem] leading-[0.8] font-black tracking-[-0.05em] tabular-nums text-white/16 sm:text-[6.5rem]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="va-label mt-6 text-white/75">Paso {String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-1 font-heading text-2xl font-black uppercase tracking-[-0.01em]">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/80">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
