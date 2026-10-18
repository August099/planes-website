"use client";

import { useState, useSyncExternalStore } from "react";
import {
  OverlayAircraftCard,
  AircraftCardProps,
} from "@/components/ui/OverlayAircraftCard";
import { SectionTitle } from "@/components/ui/home/SectionTitle";
import { ScrollCarousel } from "@/components/ui/home/ScrollCarousel";
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

      {/* VA-139: en celular se asoma la tarjeta siguiente (1,12 por pantalla); desde sm, 2. */}
      <ScrollCarousel
        label="Aeronaves destacadas"
        className="sm:px-10"
        gapClassName="gap-3 sm:gap-6"
        slideClassName="w-[calc((100%-1.44px)/1.12)] sm:w-[calc((100%-24px)/2)]"
      >
        {selectedAircrafts.map((aircraft, index) => (
          <OverlayAircraftCard
            key={aircraft.id}
            {...aircraft}
            featuredBadge={index === 0 ? "Dato Destacado" : undefined}
          />
        ))}
      </ScrollCarousel>
    </section>
  );
}