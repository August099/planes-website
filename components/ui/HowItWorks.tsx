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
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-xl font-heading font-semibold mb-8 text-center">
        Cómo funciona
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STEPS.map((step, i) => (
          <div key={step.title} className="text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-[#001F58]/[0.05] flex items-center justify-center">
              <step.icon className="h-6 w-6 text-primary" />
            </div>
            <p className="text-xs font-medium text-primary mb-1">
              Paso {i + 1}
            </p>
            <h3 className="font-heading font-semibold mb-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}