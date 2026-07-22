"use client";

import Link from "next/link";
import { AircraftCard } from "@/components/ui/AircraftCard";

type AircraftItem = {
  id: string;
  title: string;
  price: number | null;
  year: number | null; // 👈 Cambiado a 'number | null'
  category: string | null; // 👈 Cambiado a 'string | null'
  totalTimeHours: number | null; // 👈 Cambiado a 'number | null'
  city?: string | null;
  province?: string | null;
  imageUrl: string;
};

type FeaturedAircraftCarouselProps = {
  aircrafts: AircraftItem[];
};

export function FeaturedAircraftCarousel({ aircrafts }: FeaturedAircraftCarouselProps) {
  if (!aircrafts || aircrafts.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-heading font-semibold">
            Aeronaves Destacadas
          </h2>
          <p className="text-sm text-muted-foreground">
            Las últimas unidades disponibles ingresadas al mercado
          </p>
        </div>
        <Link
          href="/aircrafts"
          className="text-sm font-medium text-primary hover:underline hidden sm:block"
        >
          Ver todos los aviones →
        </Link>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none">
        {aircrafts.map((aircraft) => (
          <div
            key={aircraft.id}
            className="snap-start shrink-0 w-[280px] sm:w-[320px] lg:w-[350px]"
          >
            <AircraftCard {...aircraft} />
          </div>
        ))}
      </div>
    </section>
  );
}