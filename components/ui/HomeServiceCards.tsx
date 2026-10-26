import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Imágenes en public/cards/ (VA-52), generadas con scripts/optimize-cards.mjs.
// Rediseño (25/10, v2): fichas de borde grueso como las categorías de repuestos. La foto va enmarcada
// arriba y el pie se rellena de blanco al pasar; el estado es una etiqueta cuadrada.
export default function HomeServicesCards() {
  const cards = [
    {
      title: "AVIONES",
      status: "Disponible",
      isAvailable: true,
      image: "/cards/aircraft.webp",
      position: "object-[70%_65%]", // que se vea el avión, no solo el cielo
      href: "/aircraft",
    },
    {
      title: "REPUESTOS",
      status: "Disponible",
      isAvailable: true,
      image: "/cards/spareparts.webp",
      href: "/spareparts",
    },
    {
      title: "SERVICIOS",
      status: "En proceso", // VA-144
      isAvailable: false,
      image: "/cards/services.webp",
      href: "/services",
      hasArrow: true,
    },
  ];

  return (
    <section className="w-full pb-16 sm:pb-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="group block">
              <div className="va-tile va-tile-dark relative flex h-full flex-col overflow-hidden border-2 border-white transition-colors duration-300">
                <div className="relative h-40 overflow-hidden border-b-2 border-white sm:h-48">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className={`object-cover ${card.position ?? ""} transition-transform duration-700 ease-out group-hover:scale-105`}
                  />
                  <div className="absolute inset-0 bg-[#00205B]/25" />
                  <span
                    className={`absolute left-3 top-3 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                      card.isAvailable ? "bg-white text-[#00205B]" : "border-2 border-white bg-[#00205B] text-white"
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                <div className="flex flex-1 items-center justify-between gap-4 px-5 py-5 text-white transition-colors duration-300 group-hover:bg-white group-hover:text-[#00205B] group-focus-visible:bg-white group-focus-visible:text-[#00205B]">
                  <div>
                    <h3 className="font-heading text-2xl font-black uppercase tracking-[-0.01em] sm:text-[1.75rem]">{card.title}</h3>
                    {card.hasArrow && <p className="mt-0.5 text-xs font-semibold">Conocé más</p>}
                  </div>
                  <ArrowRight className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </div>
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[#D62828] transition-transform duration-300 group-hover:scale-x-100" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
