"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import { formatPrice } from "@/lib/format";

// Swiper React
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

// Estilos Swiper
import "swiper/css";
import "swiper/css/navigation";
import { SectionTitle } from "@/components/ui/home/SectionTitle";
import { CarouselArrow } from "@/components/ui/home/CarouselArrow";

type NamedOrString = string | { name: string } | null | undefined;

export interface FeaturedAircraftProps {
  id: string;
  title?: string;
  brand?: NamedOrString;
  model?: NamedOrString;
  price: { toNumber?: () => number } | number | string | null;
  year: number | null;
  category?: { id?: string; name: string } | string | null;
  totalTimeHours?: number | null;
  city?: string | null;
  province?: string | null;
  imageUrl: string;
  viewsCount?: number;
}

interface Props {
  aircrafts: FeaturedAircraftProps[];
}

const nameOf = (v: NamedOrString) => (typeof v === "object" && v !== null ? v.name : v || "");

// VA-85: cada destacada es una pieza asimétrica: la foto grande (protagonista) y al costado una
// "ficha" con los datos que se comparan (año, TT, ubicación) en números tabulares.
function FeaturedSlide({ aircraft, badge }: { aircraft: FeaturedAircraftProps; badge?: string }) {
  const brand = nameOf(aircraft.brand);
  const model = nameOf(aircraft.model);
  const displayTitle = brand || model ? `${brand} ${model}`.trim() : aircraft.title || "Aeronave";
  const category = typeof aircraft.category === "object" && aircraft.category !== null ? aircraft.category.name : aircraft.category;
  const location = [aircraft.city, aircraft.province].filter(Boolean).join(", ");
  const rows: [string, string | null | undefined][] = [
    ["Año", aircraft.year != null ? String(aircraft.year) : null],
    ["Horas totales", aircraft.totalTimeHours != null ? `${aircraft.totalTimeHours.toLocaleString("es-AR")} hs` : "No informadas"],
    ["Categoría", category],
    ["Ubicación", location],
  ];

  return (
    <Link
      href={`/planes/plane-details/${aircraft.id}`}
      className="group grid overflow-hidden rounded-lg border border-[#001F58]/10 bg-white lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"
    >
      <div className="relative aspect-[16/10] bg-slate-200 lg:aspect-auto lg:min-h-[360px]">
        <AppImage
          src={aircraft.imageUrl}
          alt={displayTitle}
          fill
          sizes="(min-width: 1024px) 760px, 100vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
        />
        {badge && (
          <span className="absolute left-3 top-3 rounded-sm bg-[#E70F1F] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
            {badge}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ficha de la aeronave</p>
          <h3 className="mt-1 text-xl font-bold leading-tight text-[#001F58] sm:text-2xl">{displayTitle}</h3>
        </div>
        <dl className="divide-y divide-[#001F58]/10 border-y border-[#001F58]/10 text-sm">
          {rows
            .filter(([, v]) => !!v)
            .map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
                <dd className="text-right font-medium tabular-nums text-slate-800">{value}</dd>
              </div>
            ))}
        </dl>
        <div className="mt-auto flex items-end justify-between gap-4">
          <span className="text-2xl font-bold tabular-nums text-[#001F58]">{formatPrice(aircraft.price, { fallback: "Consultar" })}</span>
          <span className="text-sm font-semibold text-[#C20D1A] group-hover:underline">Ver ficha →</span>
        </div>
      </div>
    </Link>
  );
}

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

      <div className="relative">
        <CarouselArrow id="swiper-aircraft-prev" direction="prev" />
        <Swiper
          modules={[Navigation]}
          navigation={{
            prevEl: "#swiper-aircraft-prev",
            nextEl: "#swiper-aircraft-next",
          }}
          spaceBetween={24}
          slidesPerView={1}
          className="py-2"
        >
          {selectedAircrafts.map((aircraft, index) => (
            <SwiperSlide key={aircraft.id} className="h-auto">
              <FeaturedSlide aircraft={aircraft} badge={index === 0 ? "Dato destacado" : undefined} />
            </SwiperSlide>
          ))}
        </Swiper>
        <CarouselArrow id="swiper-aircraft-next" direction="next" />
      </div>
    </section>
  );
}
