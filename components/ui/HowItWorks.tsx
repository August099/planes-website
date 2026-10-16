import { SectionTitle } from "@/components/ui/home/SectionTitle";

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

// VA-85: los tres pasos como una ruta de carta de navegación (waypoints numerados unidos por una
// línea punteada), en vez de tres tarjetas iguales con ícono. Horizontal desde md, vertical en celular.
export function HowItWorks() {
  return (
    <section className="w-full text-white py-16">
      <div className="container mx-auto px-4">
        <SectionTitle tone="dark" className="mb-10 text-center">
          Cómo funciona
        </SectionTitle>
        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Ruta punteada: vertical en celular, horizontal desde md */}
          <span
            aria-hidden
            className="absolute left-[11px] top-3 bottom-3 border-l border-dashed border-white/35 md:left-3 md:right-[calc(33%-1rem)] md:top-[11px] md:bottom-auto md:border-l-0 md:border-t"
          />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative pl-10 md:pl-0 md:pt-10">
              {/* Waypoint */}
              <span
                aria-hidden
                className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/80 bg-[#0A4C96]"
              >
                <span className="h-2 w-2 rounded-full bg-[#E70F1F]" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFC2C7] tabular-nums">
                Paso {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/75">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
