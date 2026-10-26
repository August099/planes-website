import { Camera, Handshake, MessagesSquare } from "lucide-react";
import { DisplayTitle } from "@/components/ui/home/DisplayTitle";
import { FlightPaths } from "@/components/ui/home/FlightPaths";

const STEPS = [
  {
    title: "Publicá tu avión",
    description: "Cargá fotos, precio y detalles en pocos minutos.",
    icon: Camera,
  },
  {
    title: "Recibí contactos",
    description: "Compradores interesados te escriben directo, sin intermediarios.",
    icon: MessagesSquare,
  },
  {
    title: "Cerrá la venta",
    description: "Coordiná la operación vos mismo, a tu manera.",
    icon: Handshake,
  },
];

// VA-85: los tres pasos como una ruta. Rediseño moderno (26/10): tarjetas redondeadas translúcidas sobre
// el azul, cada una con su ícono en una placa de degradé (en vez de los números grandes, que ya están en
// los títulos de sección), y la ruta de vuelo animada de fondo.
export function HowItWorks() {
  return (
    <section className="relative w-full py-20 text-white">
      <div className="container mx-auto px-4">
        <DisplayTitle tone="dark">Cómo funciona</DisplayTitle>

        <div className="relative mt-12">
          <FlightPaths id="va-route-steps" tone="dark" className="hidden md:block" />
          <ol className="relative grid gap-5 md:grid-cols-3 md:gap-6">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="va-rise rounded-[28px] border border-white/12 bg-white/[0.07] p-7 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.1]"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#D62828_0%,#B71F1F_100%)] shadow-[0_14px_30px_-12px_rgb(214_40_40/0.7)]">
                  <step.icon aria-hidden strokeWidth={1.75} className="h-8 w-8 text-white" />
                </span>
                {/* Sin .va-label: su color azul (fuera de capa) pisaba el blanco y el rótulo no se veía sobre el azul. */}
                <p className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/75 tabular-nums">Paso {String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 font-heading text-2xl font-extrabold tracking-[-0.02em]">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/80">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
