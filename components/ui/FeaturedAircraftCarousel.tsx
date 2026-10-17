"use client";

import { useState, useSyncExternalStore } from "react";
import {
  OverlayAircraftCard,
  AircraftCardProps,
} from "@/components/ui/OverlayAircraftCard";

// Swiper React
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

// Estilos Swiper
import "swiper/css";
import "swiper/css/navigation";
import { SectionTitle } from "@/components/ui/home/SectionTitle";
import { CarouselArrow, CarouselDots, carouselPagination } from "@/components/ui/home/CarouselArrow";
import { FEATURED_AIRCRAFT_COUNT } from "@/lib/constants";

export interface FeaturedAircraftProps extends AircraftCardProps {
  viewsCount?: number;
}

interface Props {
  aircrafts: FeaturedAircraftProps[];
}

// VA-110: hasta que existan los destacados pagos (VA-95), 6 al azar entre las recientes activas.
function pickFeatured(aircrafts: FeaturedAircraftProps[]) {
  const pool = [...aircrafts];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, FEATURED_AIRCRAFT_COUNT);
}

const subscribeNothing = () => () => {};

// Aeronaves Destacadas: diseño original (tarjetas de foto con marca, modelo, precio y año encima),
// restaurado el 10/10 a pedido del socio; las flechas son las unificadas de VA-82.
export function FeaturedAircraftCarousel({ aircrafts }: Props) {
  // La elección es al azar, así que se hace solo en el navegador: en el servidor y durante la
  // hidratación no se renderiza nada, para evitar descalces (VA-63, antes con setState en un efecto).
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!isClient || !aircrafts || aircrafts.length === 0) return null;
  return <FeaturedCarousel aircrafts={aircrafts} />;
}

function FeaturedCarousel({ aircrafts }: Props) {
  const [selectedAircrafts] = useState(() => pickFeatured(aircrafts));

  return (
    <section className="py-8 relative">
      {/* ENCABEZADO */}
      <div className="text-center mb-8">
        <SectionTitle>Aeronaves Destacadas</SectionTitle>
      </div>

      {/* CONTENEDOR CON NAVEGACIÓN LATERAL */}
      <div className="relative sm:px-10">
        <CarouselArrow id="swiper-aircraft-prev" direction="prev" />

        {/* SWIPER */}
        <Swiper
          modules={[Navigation, Pagination]}
          navigation={{
            prevEl: "#swiper-aircraft-prev",
            nextEl: "#swiper-aircraft-next",
          }}
          pagination={carouselPagination("swiper-aircraft-dots")}
          spaceBetween={12}
          // VA-139: en celular se asoma la tarjeta siguiente.
          slidesPerView={1.12}
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
        <CarouselDots id="swiper-aircraft-dots" />
      </div>
    </section>
  );
}