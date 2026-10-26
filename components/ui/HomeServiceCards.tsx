import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Imágenes en public/cards/ (VA-52; fotos nuevas del socio, 26/10), generadas con scripts/optimize-cards.mjs.
// Rediseño (25/10, v2): fichas de borde grueso como las categorías de repuestos. La foto va enmarcada
// arriba y el pie se rellena de blanco al pasar; el estado es una etiqueta cuadrada.
export default function HomeServicesCards() {
  const cards = [
    {
      title: "AVIONES",
      status: "Disponible",
      isAvailable: true,
      image: "/cards/aircraft-home.webp",
      position: "object-[50%_100%]", // foto vertical: el avión está abajo; así queda más arriba en la tarjeta
      href: "/aircraft",
    },
    {
      title: "REPUESTOS",
      status: "Disponible",
      isAvailable: true,
      image: "/cards/sparepart-home.webp",
      href: "/spareparts",
    },
    {
      title: "SERVICIOS",
      status: "En proceso", // VA-144
      isAvailable: false,
      image: "/cards/services-home.webp",
      position: "object-[50%_55%]", // foto vertical: la caja de herramientas al centro
      href: "/services",
      hasArrow: true,
    },
  ];

  return (
    <section className="w-full pb-16 sm:pb-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="va-rise group block">
              {/* Moderno (26/10): tarjeta redondeada translúcida; la foto crece al pasar y la flecha va en un círculo rojo. */}
              <div className="va-tile va-tile-dark relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#0A4C96]/25 p-2 backdrop-blur-md group-hover:border-white/30">
                <div className="relative h-56 overflow-hidden rounded-[22px] sm:h-64">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className={`object-cover ${card.position ?? ""} transition-transform duration-700 ease-out group-hover:scale-105`}
                  />
                  {/* Velo azul leve con un poco de desenfoque abajo (26/10). */}
                  <div className="absolute inset-0 bg-[#0A4C96]/15" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#00205B]/55 to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_top,black,transparent)]" />
                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] backdrop-blur-md ${
                      card.isAvailable ? "bg-white/90 text-[#00205B]" : "bg-[#00205B]/70 text-white ring-1 ring-white/40"
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                <div className="flex flex-1 items-center justify-between gap-4 px-4 pb-3 pt-5 text-white">
                  <div>
                    <h3 className="font-heading text-2xl font-extrabold tracking-[-0.02em] sm:text-[1.75rem]">{card.title}</h3>
                    {card.hasArrow && <p className="mt-0.5 text-xs font-semibold text-white/80">Conocé más</p>}
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D62828] transition-transform duration-300 group-hover:scale-110">
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
