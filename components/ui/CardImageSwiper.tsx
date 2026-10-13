"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";

import { AppImage } from "@/components/ui/AppImage";
import { CARD_IMAGE_SIZES, type ImageCarouselImage } from "@/components/ui/CardImageCarousel";

// Carrusel de fotos de una card (VA-76): se carga aparte con next/dynamic y se monta recién cuando
// el usuario interactúa con la card, así /planes no inicializa 21 Swipers al hidratar.
export default function CardImageSwiper({
  images,
  alt,
  onSwiper,
}: {
  images: ImageCarouselImage[];
  alt: string;
  onSwiper: (swiper: SwiperType) => void;
}) {
  return (
    <Swiper
      onSwiper={onSwiper}
      slidesPerView={1}
      spaceBetween={0}
      loop
      className="w-full h-full"
    >
      {images.map((image, index) => (
        <SwiperSlide key={`${image.id}-${index}`}>
          <div className="relative w-full h-full">
            <AppImage
              src={image.url}
              alt={`${alt} - Foto ${index + 1}`}
              fill
              sizes={CARD_IMAGE_SIZES}
              className="object-cover"
            />
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
