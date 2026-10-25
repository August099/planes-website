"use client";

import { useState, useSyncExternalStore } from "react";
import {
  OverlayAircraftCard,
  AircraftCardProps,
} from "@/components/ui/OverlayAircraftCard";
import { DisplayTitle } from "@/components/ui/home/DisplayTitle";
import { BrandSlashes } from "@/components/ui/BrandSlashes";
import { ScrollCarousel } from "@/components/ui/home/ScrollCarousel";
import { FEATURED_AIRCRAFT_COUNT } from "@/lib/constants";

export interface FeaturedAircraftProps extends AircraftCardProps {
  viewsCount?: number;
  /** VA-168: aviso de una cuenta con destacadas (Pro, Broker o admin). */
  planFeatured?: boolean;
}

interface Props {
  aircrafts: FeaturedAircraftProps[];
}

function shuffle<T>(list: T[]): T[] {
  const pool = [...list];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// VA-110 / VA-168: 6 al azar entre los avisos de cuentas con destacadas (Pro, Broker y admins); si son
// menos de 6, se completa al azar con los demás recientes.
function pickFeatured(aircrafts: FeaturedAircraftProps[]) {
  const featured = shuffle(aircrafts.filter((a) => a.planFeatured));
  const others = shuffle(aircrafts.filter((a) => !a.planFeatured));
  return [...featured, ...others].slice(0, FEATURED_AIRCRAFT_COUNT);
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
    // Rediseño (25/10, v2): banda azul a todo el ancho entre las zonas claras ("el hangar de noche").
    <section className="home-band-dark relative isolate overflow-hidden bg-[#00205B] py-16 sm:py-20">
      <BrandSlashes className="-top-10 right-[-6rem] w-80 sm:w-[30rem]" />
      <div className="container mx-auto px-4">
      <DisplayTitle tone="dark" className="mb-10">Aeronaves Destacadas</DisplayTitle>

      {/* VA-139: en celular se asoma la tarjeta siguiente (1,12 por pantalla); desde sm, 2.
          VA-168 (socio, 24/10): sin etiqueta "Destacado" en las tarjetas. */}
      <ScrollCarousel
        label="Aeronaves destacadas"
        gapClassName="gap-3 sm:gap-6"
        slideClassName="w-[calc((100%-1.44px)/1.12)] sm:w-[calc((100%-24px)/2)]"
      >
        {selectedAircrafts.map((aircraft) => (
          <OverlayAircraftCard key={aircraft.id} {...aircraft} />
        ))}
      </ScrollCarousel>
      </div>
    </section>
  );
}