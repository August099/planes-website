"use client";

import Link from "next/link";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";

// Swiper React
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

// Estilos de Swiper
import "swiper/css";
import "swiper/css/navigation";
import { SectionTitle } from "@/components/ui/home/SectionTitle";
import { CarouselArrow, CarouselDots, carouselPagination } from "@/components/ui/home/CarouselArrow";

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
          <SectionTitle>Últimas Publicaciones</SectionTitle>
          <p className="text-sm text-slate-600 mt-1">
            Lo último en aeronaves y repuestos certificados ingresados al mercado
          </p>
        </div>
        <div className="flex gap-4 hidden sm:flex text-sm font-semibold text-[#001F58]">
          <Link href="/aircraft" className="hover:underline">
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
        <CarouselArrow id="swiper-latest-listings-prev" direction="prev" />

        <Swiper
          modules={[Navigation, Pagination]}
          navigation={{
            prevEl: "#swiper-latest-listings-prev",
            nextEl: "#swiper-latest-listings-next",
          }}
          pagination={carouselPagination("swiper-latest-listings-dots")}
          spaceBetween={12}
          // VA-139: en celular se asoma la tarjeta siguiente.
          slidesPerView={1.15}
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

        <CarouselArrow id="swiper-latest-listings-next" direction="next" />
        <CarouselDots id="swiper-latest-listings-dots" />
      </div>
    </section>
  );
}