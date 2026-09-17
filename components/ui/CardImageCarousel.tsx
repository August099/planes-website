"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";

import { AppImage } from "@/components/ui/AppImage";

type ImageCarouselImage = {
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

  console.log("ImageCarousel:", {
  images,
  imagesLength: images.length,
  finalImagesLength: finalImages.length,
});

  const hasMultipleImages = finalImages.length > 1;

  return (
    <div
      className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        slidesPerView={1}
        spaceBetween={0}
        loop={hasMultipleImages}
        allowTouchMove={hasMultipleImages}
        className="w-full h-full"
      >
        {finalImages.map((image, index) => (
          <SwiperSlide key={`${image.id}-${index}`}>
            <div className="relative w-full h-full">
              <AppImage
                src={image.url}
                alt={`${alt} - Foto ${index + 1}`}
                fill
                optimizedWidth={600}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

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