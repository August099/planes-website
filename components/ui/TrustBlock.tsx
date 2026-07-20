import { ShieldCheck, Users, MapPin } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Sin intermediarios",
    description: "Contacto directo con quien vende, sin comisiones ocultas.",
  },
  {
    icon: Users,
    title: "Comunidad del rubro",
    description: "Particulares y comisionistas de todo el país.",
  },
  {
    icon: MapPin,
    title: "Alcance nacional",
    description: "Aviones publicados en toda Argentina.",
  },
];

export function TrustBlock() {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 border border-[#001F58]/10 bg-[#001F58]/[0.025] rounded-xl p-5"
          >
            <item.icon className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}