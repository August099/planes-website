import { FileEdit, MessageCircle, Handshake } from "lucide-react";
import { SectionTitle } from "@/components/ui/home/SectionTitle";

const STEPS = [
  {
    icon: FileEdit,
    title: "Publicá tu avión",
    description: "Cargá fotos, precio y detalles en pocos minutos.",
  },
  {
    icon: MessageCircle,
    title: "Recibí contactos",
    description: "Compradores interesados te escriben directo, sin intermediarios.",
  },
  {
    icon: Handshake,
    title: "Cerrá la venta",
    description: "Coordiná la operación vos mismo, a tu manera.",
  },
];

export function HowItWorks() {
  return (
    <section className="w-full text-white py-16">
      <div className="container mx-auto px-4">
        <SectionTitle tone="dark" className="mb-10 text-center">
          Cómo funciona
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center group">
              {/* VA-49: círculo rojo de marca con ícono blanco (antes, blanco translúcido con ícono rojo) */}
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary group-hover:bg-red-700 flex items-center justify-center transition-colors duration-300">
                <step.icon className="h-7 w-7 text-white" />
              </div>

              {/* VA-79: rosado claro para AA sobre el azul de la zona 4 (el rojo daba 1,8:1) */}
              <p className="text-xs font-semibold text-[#FFC2C7] uppercase tracking-wider mb-1">
                Paso {i + 1}
              </p>

              {/* Título en Blanco puro */}
              <h3 className="font-heading font-semibold text-lg text-white mb-2">
                {step.title}
              </h3>

              {/* Descripción en Blanco translúcido */}
              <p className="text-sm text-white/70 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}