import { FileEdit, MessageCircle, Handshake } from "lucide-react";

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
    <section className="w-full bg-secondary text-white py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-heading font-semibold mb-10 text-center text-white">
          Cómo funciona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center group">
              {/* Círculo con fondo oscuro translúcido */}
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-white/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors duration-300 border border-white/10 group-hover:border-primary/50">
                <step.icon className="h-7 w-7 text-primary" />
              </div>

              {/* Número de paso en Rojo */}
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
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