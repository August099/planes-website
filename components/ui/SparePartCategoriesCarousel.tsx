"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DynamicCategoryIcon } from "@/components/ui/DynamicCategoryIcon";

// Importaciones de Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

// Estilos de Swiper obligatorios
import "swiper/css";
import "swiper/css/navigation";

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
          <h2 className="text-xl font-heading font-semibold">
            Buscar Repuestos por Categoría
          </h2>
          <p className="text-sm text-muted-foreground">
            Encuentra piezas y componentes certificados para tu aeronave
          </p>
        </div>
        <Link
          href="/spare-parts"
          className="text-sm font-medium text-primary hover:underline hidden sm:block"
        >
          Ver todo el catálogo →
        </Link>
      </div>

      {/* CONTENEDOR DEL CARRUSEL */}
      <div className="relative px-1">
        {/* BOTÓN NAVEGACIÓN IZQUIERDA */}
        <button
          id="swiper-button-prev-cat"
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-0 disabled:pointer-events-none transition-all duration-200"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* SWIPER */}
        <Swiper
          modules={[Navigation]}
          navigation={{
            prevEl: "#swiper-button-prev-cat",
            nextEl: "#swiper-button-next-cat",
          }}
          spaceBetween={16}
          slidesPerView={2} // Para móviles pequeños
          breakpoints={{
            480: {
              slidesPerView: 3,
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
          className="py-2 !overflow-hidden rounded-2xl"
        >
          {categories.map((cat) => (
            <SwiperSlide key={cat.id} className="h-auto">
              <Link
                href={`/spareparts?category=${cat.id}`}
                className="block h-full"
              >
                <Card className="aspect-square w-full bg-white dark:bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 group/card cursor-pointer rounded-2xl overflow-hidden">
                  <CardContent className="p-4 flex flex-col items-center text-center justify-center h-full w-full">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 group-hover/card:bg-primary group-hover/card:text-white transition-colors duration-200 shrink-0">
                      <DynamicCategoryIcon
                        name={cat.icon}
                        className="h-6 w-6 text-[#001F58] group-hover/card:text-white transition-colors"
                      />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 group-hover/card:text-primary transition-colors line-clamp-2">
                      {cat.name}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* BOTÓN NAVEGACIÓN DERECHA */}
        <button
          id="swiper-button-next-cat"
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-0 disabled:pointer-events-none transition-all duration-200"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}