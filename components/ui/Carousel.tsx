"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import {
  Navigation,
  Autoplay,
  Parallax,
  Zoom,
  Thumbs,
} from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/parallax";
import "swiper/css/zoom";
import "swiper/css/thumbs";

import Image from "next/image";

type GalleryProps = {
  images: { url: string; alt?: string }[];
};

export function AircraftGallery({ images }: GalleryProps) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  return (
    <div className="relative">
      <Swiper
        modules={[Navigation, Autoplay, Parallax, Zoom, Thumbs]}
        spaceBetween={10}
        slidesOffsetBefore={10}
        slidesOffsetAfter={10}
        speed={500}
        rewind
        parallax
        navigation
        autoplay={{ delay: 5000, pauseOnMouseEnter: true }}
        zoom
        thumbs={{ swiper: thumbsSwiper }}
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <div className="swiper-zoom-container">
              <Image
                src={image.url}
                alt={image.alt ?? "Foto del avión"}
                width={800}
                height={600}
                className="object-cover w-full h-full"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <Swiper
        onSwiper={setThumbsSwiper}
        modules={[Thumbs]}
        spaceBetween={8}
        slidesPerView={10}
        watchSlidesProgress
        className="mt-3"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index} className="cursor-pointer opacity-60 hover:opacity-100">
            <Image
              src={image.url}
              alt={image.alt ?? "Miniatura"}
              width={90}
              height={60}
              className="object-cover rounded"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}