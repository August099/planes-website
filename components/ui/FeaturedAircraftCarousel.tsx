"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  OverlayAircraftCard,
  AircraftCardProps,
} from "@/components/ui/OverlayAircraftCard";

// Swiper React
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

// Estilos Swiper
import "swiper/css";
import "swiper/css/navigation";

interface Props {
  aircrafts: AircraftCardProps[];
}

export function FeaturedAircraftCarousel({ aircrafts }: Props) {
  if (!aircrafts || aircrafts.length === 0) return null;

  return (
    <section className="py-8 relative">
      {/* ENCABEZADO IDÉNTICO A LA FOTO */}
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#001F58] tracking-tight inline-block relative pb-2">
          Aeronaves Destacadas
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#001F58] rounded-full" />
        </h2>
      </div>

      {/* CONTENEDOR CON NAVEGACIÓN LATERAL */}
      <div className="relative px-6 sm:px-10">
        {/* FLECHA IZQUIERDA */}
        <button
          id="swiper-aircraft-prev"
          className="absolute -left-2 sm:left-0 top-1/2 -translate-y-1/2 z-20 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
        </button>

        {/* SWIPER */}
        <Swiper
          modules={[Navigation]}
          navigation={{
            prevEl: "#swiper-aircraft-prev",
            nextEl: "#swiper-aircraft-next",
          }}
          spaceBetween={20}
          slidesPerView={1}
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 24,
            },
          }}
          className="py-2"
        >
          {aircrafts.map((aircraft, index) => (
            <SwiperSlide key={aircraft.id} className="h-auto">
              <OverlayAircraftCard
                {...aircraft}
                // Si quieres simular la etiqueta "Dato Destacado" en el primero
                featuredBadge={index === 0 ? "Dato Destacado" : undefined}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* FLECHA DERECHA */}
        <button
          id="swiper-aircraft-next"
          className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 z-20 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
        </button>
      </div>
    </section>
  );
}