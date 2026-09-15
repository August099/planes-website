"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";

// Swiper React
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

// Estilos de Swiper
import "swiper/css";
import "swiper/css/navigation";

type CategoryProp = { id?: string; name: string } | string | null;

export type ListingItem =
  | {
      type: "AIRCRAFT";
      id: string;
      title: string;
      price: number | null;
      year: number | null;
      category: CategoryProp;
      totalTimeHours: number | null;
      city?: string | null;
      province?: string | null;
      imageUrl: string;
      createdAt: string | Date;
      isFavoriteInitial?: boolean;
    }
  | {
      type: "SPARE_PART";
      id: string;
      title: string;
      price: number | null;
      inPesos?: boolean;
      category: CategoryProp;
      city?: string | null;
      province?: string | null;
      imageUrl: string;
      createdAt: string | Date;
      isFavoriteInitial?: boolean;
    };

type LatestListingsProps = {
  items: ListingItem[];
};

export function LatestAircraft({ items }: LatestListingsProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-8 relative">
      {/* TÍTULO Y NAVEGACIÓN */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#001F58] tracking-tight">
            Últimas Publicaciones
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Lo último en aeronaves y repuestos certificados ingresados al mercado
          </p>
        </div>
        <div className="flex gap-4 hidden sm:flex text-sm font-semibold text-[#001F58]">
          <Link href="/planes" className="hover:underline">
            Ver Aviones →
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/spareparts" className="hover:underline">
            Ver Repuestos →
          </Link>
        </div>
      </div>

      {/* CARRUSEL SWIPER */}
      <div className="relative">
        {/* FLECHA IZQUIERDA */}
        <button
          id="swiper-latest-listings-prev"
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
        </button>

        <Swiper
          modules={[Navigation]}
          navigation={{
            prevEl: "#swiper-latest-listings-prev",
            nextEl: "#swiper-latest-listings-next",
          }}
          spaceBetween={20}
          slidesPerView={1}
          breakpoints={{
            480: {
              slidesPerView: 2,
              spaceBetween: 16,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 20,
            },
            1280: {
              slidesPerView: 4,
              spaceBetween: 24,
            },
          }}
          className="py-2"
        >
          {items.map((item) => (
            <SwiperSlide key={`${item.type}-${item.id}`} className="h-auto">
              {item.type === "AIRCRAFT" ? (
                <AircraftCard
                  id={item.id}
                  title={item.title}
                  price={item.price}
                  year={item.year}
                  category={item.category}
                  totalTimeHours={item.totalTimeHours}
                  city={item.city}
                  province={item.province}
                  imageUrl={item.imageUrl}
                  isFavoriteInitial={item.isFavoriteInitial}
                />
              ) : (
                <SparePartCard
                  id={item.id}
                  title={item.title}
                  price={item.price}
                  inPesos={item.inPesos}
                  category={item.category}
                  city={item.city}
                  province={item.province}
                  imageUrl={item.imageUrl}
                  isFavoriteInitial={item.isFavoriteInitial}
                />
              )}
            </SwiperSlide>
          ))}
        </Swiper>

        {/* FLECHA DERECHA */}
        <button
          id="swiper-latest-listings-next"
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
        </button>
      </div>
    </section>
  );
}