"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DynamicCategoryIcon } from "@/components/ui/DynamicCategoryIcon";

// Importaciones de Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

// Estilos de Swiper obligatorios
import "swiper/css";
import "swiper/css/navigation";
import { SectionTitle } from "@/components/ui/home/SectionTitle";
import { CarouselArrow, CarouselDots, carouselPagination } from "@/components/ui/home/CarouselArrow";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

interface Props {
  categories: CategoryItem[];
}

export function SparePartCategoriesCarousel({ categories }: Props) {
  return (
    <section className="py-6 relative group">
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <SectionTitle>Buscar Repuestos por Categoría</SectionTitle>
          <p className="text-sm text-slate-600 mt-1">
            Encontrá piezas y componentes certificados para tu aeronave
          </p>
        </div>
        <Link
          href="/spareparts"
          className="text-sm font-medium text-[#C20D1A] hover:underline hidden sm:block"
        >
          Ver todo el catálogo →
        </Link>
      </div>

      {/* CONTENEDOR DEL CARRUSEL */}
      <div className="relative px-1">
        <CarouselArrow id="swiper-button-prev-cat" direction="prev" />

        {/* SWIPER */}
        <Swiper
          modules={[Navigation, Pagination]}
          navigation={{
            prevEl: "#swiper-button-prev-cat",
            nextEl: "#swiper-button-next-cat",
          }}
          pagination={carouselPagination("swiper-cat-dots")}
          spaceBetween={12}
          // VA-139: en celular se asoma la tarjeta siguiente.
          slidesPerView={2.3}
          breakpoints={{
            480: {
              slidesPerView: 3.3,
              spaceBetween: 16,
            },
            640: {
              slidesPerView: 4,
              spaceBetween: 16,
            },
            768: {
              slidesPerView: 5,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 6,
              spaceBetween: 20,
            },
          }}
          className="py-2 !overflow-hidden"
        >
          {categories.map((cat) => (
            <SwiperSlide key={cat.id} className="h-auto">
              <Link
                href={`/spareparts?category=${cat.id}`}
                className="block h-full"
              >
                <Card className="home-card group/card flex h-full min-h-28 w-full flex-col justify-between gap-3 rounded-lg border-slate-200 bg-white p-4 shadow-sm transition-colors duration-200 hover:border-[#E70F1F] cursor-pointer">
                  <DynamicCategoryIcon
                    name={cat.icon}
                    className="h-6 w-6 text-[#001F58] transition-colors group-hover/card:text-[#E70F1F]"
                  />
                  <span className="line-clamp-2 text-left text-xs font-semibold leading-snug text-slate-800 sm:text-sm">
                    {cat.name}
                  </span>
                </Card>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        <CarouselArrow id="swiper-button-next-cat" direction="next" />
        <CarouselDots id="swiper-cat-dots" />
      </div>
    </section>
  );
}