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
    <section className="relative w-full max-w-6xl mx-auto px-4 py-12">
      {/* Fondo con tonos azules decorativos detrás del módulo */}
      <div className="absolute inset-x-4 inset-y-4 -z-10 rounded-3xl bg-gradient-to-r from-[#001F58]/20 via-[#001F58]/10 to-blue-900/15 backdrop-blur-md border border-[#001F58]/10 shadow-inner" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-2">
        {cards.map((card, index) => (
          <Link key={index} href={card.href} className="block group">
            <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden border border-[#001F58]/20 bg-[#001F58] shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer">
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />

              <div className="absolute inset-0 bg-[#001F58]/50 mix-blend-multiply transition-opacity duration-300 group-hover:bg-[#001F58]/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001F58]/95 via-[#001F58]/40 to-transparent" />


              <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
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

                {/* Título y flecha */}
                <div className="space-y-1">
                  {card.hasArrow && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90 group-hover:text-white transition-colors pt-0.5">
                      <span>Conocé más</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>
                  )}
                  
                  <h3 className="text-xl sm:text-2xl font-black tracking-wider text-white drop-shadow-md">
                    {card.title}
                  </h3>

                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}