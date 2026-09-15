"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomeServicesCards() {
  const cards = [
    {
      title: "AVIONES",
      status: "Disponible",
      isAvailable: true,
      image: "/card-plane.png",
      href: "/planes",
    },
    {
      title: "REPUESTOS",
      status: "Disponible",
      isAvailable: true,
      image: "/card-sparepart.png",
      href: "/spareparts",
    },
    {
      title: "SERVICIOS",
      status: "Próximamente",
      isAvailable: false,
      image: "/card-service.png",
      href: "/services",
      hasArrow: true,
    },
  ];

  return (
    /* SECCIÓN DE ANCHO COMPLETO SIN ESQUINAS REDONDEADAS */
    <section className="w-full bg-[#001F58] py-8 sm:py-12">
      <div className="container mx-auto px-4">
        {/* GRILLA ADAPTABLE A MOBILE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {cards.map((card, index) => (
            <Link key={index} href={card.href} className="block group">
              <div className="relative w-full h-40 sm:h-48 md:h-52 rounded-2xl overflow-hidden border border-white/20 bg-[#001F58] shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                <div className="absolute inset-0 bg-[#001F58]/50 mix-blend-multiply transition-opacity duration-300 group-hover:bg-[#001F58]/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001F58]/95 via-[#001F58]/40 to-transparent" />

                <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10">
                  <div className="flex justify-start">
                    <span
                      className={`text-xs sm:text-sm font-medium italic tracking-wide ${
                        card.isAvailable
                          ? "text-emerald-300/90 drop-shadow-sm"
                          : "text-blue-200/90 drop-shadow-sm"
                      }`}
                    >
                      {card.status}
                    </span>
                  </div>

                  {/* TÍTULO Y FLECHA */}
                  <div className="space-y-0.5 sm:space-y-1">
                    {card.hasArrow && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90 group-hover:text-white transition-colors pt-0.5">
                        <span>Conocé más</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                      </div>
                    )}

                    <h3 className="text-lg sm:text-xl md:text-2xl font-black tracking-wider text-white drop-shadow-md">
                      {card.title}
                    </h3>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}