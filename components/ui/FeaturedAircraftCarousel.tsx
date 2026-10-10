"use client";

import { useState, useEffect } from "react";
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
import { SectionTitle } from "@/components/ui/home/SectionTitle";
import { CarouselArrow } from "@/components/ui/home/CarouselArrow";

export interface FeaturedAircraftProps extends AircraftCardProps {
  viewsCount?: number;
}

interface Props {
  aircrafts: FeaturedAircraftProps[];
}

// Aeronaves Destacadas: diseño original (tarjetas de foto con marca, modelo, precio y año encima),
// restaurado el 10/10 a pedido del socio; las flechas son las unificadas de VA-82.
export function FeaturedAircraftCarousel({ aircrafts }: Props) {
  const [selectedAircrafts, setSelectedAircrafts] = useState<FeaturedAircraftProps[]>([]);

  useEffect(() => {
    if (!aircrafts || aircrafts.length === 0) return;

    let pool = [...aircrafts];

    if (pool.length >= 20) {
      // Si hay 20 o más, tomamos las 10 con más vistas
      pool.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
      pool = pool.slice(0, 10);
    }

    // Mezclamos aleatoriamente en el cliente y tomamos 2
    const shuffled = pool.sort(() => 0.5 - Math.random());
    setSelectedAircrafts(shuffled.slice(0, 2));
  }, [aircrafts]);

  // Si no se han seleccionado aún en el cliente, no renderizamos nada para evitar parpadeos/descalces
  if (selectedAircrafts.length === 0) return null;

  return (
    <section className="py-8 relative">
      {/* ENCABEZADO */}
      <div className="text-center mb-8">
        <SectionTitle>Aeronaves Destacadas</SectionTitle>
      </div>

      {/* CONTENEDOR CON NAVEGACIÓN LATERAL */}
      <div className="relative px-6 sm:px-10">
        <CarouselArrow id="swiper-aircraft-prev" direction="prev" />

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
          {selectedAircrafts.map((aircraft, index) => (
            <SwiperSlide key={aircraft.id} className="h-auto">
              <OverlayAircraftCard
                {...aircraft}
                featuredBadge={index === 0 ? "Dato Destacado" : undefined}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        <CarouselArrow id="swiper-aircraft-next" direction="next" />
      </div>
    </section>
  );
}