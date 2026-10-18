"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Swiper as SwiperType } from "swiper";

import { AppImage } from "@/components/ui/AppImage";

export const CARD_IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

// VA-76: Swiper se descarga y se monta recién cuando el usuario interactúa con la card.
const CardImageSwiper = dynamic(() => import("@/components/ui/CardImageSwiper"), { ssr: false });

export type ImageCarouselImage = {
  id: string;
  url: string;
  order: number;
};

type ImageCarouselProps = {
  images: ImageCarouselImage[];
  fallbackImage?: string;
  alt: string;
};

export function ImageCarousel({
  images,
  fallbackImage,
  alt,
}: ImageCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  // VA-74: en el HTML inicial va solo la primera foto de cada card. VA-76: tampoco se monta Swiper
  // hasta que el usuario interactúa (mouse encima, toque o foco): antes /aircraft inicializaba 21
  // carruseles al hidratar y era lo que más pesaba en el TBT. En celular, el primer deslizamiento
  // monta el carrusel y el siguiente ya cambia de foto.
  const [revealed, setRevealed] = useState(false);
  const reveal = () => setRevealed(true);

  const finalImages: ImageCarouselImage[] =
    images.length > 0
      ? images
      : fallbackImage
        ? [
            {
              id: "fallback",
              url: fallbackImage,
              order: 0,
            },
          ]
        : [];

  if (finalImages.length === 0) {
    return (
      <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
        <span className="text-xs text-slate-400">
          Sin imagen
        </span>
      </div>
    );
  }

  const hasMultipleImages = finalImages.length > 1;

  return (
    <div
      className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-100"
      onMouseEnter={() => {
        setIsHovered(true);
        reveal();
      }}
      onTouchStart={reveal}
      onFocus={reveal}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Primera foto fija: es lo que se ve hasta que Swiper termina de cargar (y queda debajo). */}
      <AppImage
        src={finalImages[0].url}
        alt={`${alt} - Foto 1`}
        fill
        sizes={CARD_IMAGE_SIZES}
        className="object-cover"
      />

      {hasMultipleImages && revealed && (
        <div className="absolute inset-0 z-10">
          <CardImageSwiper
            images={finalImages}
            alt={alt}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
          />
        </div>
      )}

      {hasMultipleImages && (
        <>
          <button
            type="button"
            aria-label="Imagen anterior"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              swiperRef.current?.slidePrev();
            }}
            className={`
              absolute left-2 top-1/2 -translate-y-1/2 z-30
              w-7 h-7 rounded-full
              bg-white/90 backdrop-blur-sm
              text-slate-700 shadow-md
              flex items-center justify-center
              transition-all duration-200
              cursor-pointer
              hover:bg-white hover:scale-110
              ${
                isHovered
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Imagen siguiente"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              swiperRef.current?.slideNext();
            }}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2 z-30
              w-7 h-7 rounded-full
              bg-white/90 backdrop-blur-sm
              text-slate-700 shadow-md
              flex items-center justify-center
              transition-all duration-200
              cursor-pointer
              hover:bg-white hover:scale-110
              ${
                isHovered
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }
            `}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}