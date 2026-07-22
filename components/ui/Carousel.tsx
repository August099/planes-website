"use client";

import { useEffect, useRef, useState } from "react";
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
  const swiperRef = useRef<SwiperType | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomLevel = useRef(1);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 6;
  const STEP = 0.15;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!swiperRef.current) return;
      e.preventDefault();

      const delta = e.deltaY < 0 ? STEP : -STEP;
      zoomLevel.current = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, zoomLevel.current + delta)
      );

      console.log(zoomLevel.current)
      if (zoomLevel.current <= MIN_ZOOM) {
        swiperRef.current.zoom.out();
        zoomLevel.current = MIN_ZOOM;
      } else {
        swiperRef.current.zoom.in(zoomLevel.current);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Swiper
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        onZoomChange={(_swiper, scale) => {
            zoomLevel.current = scale;
        }}
        modules={[Navigation, Autoplay, Parallax, Zoom, Thumbs]}
        spaceBetween={10}
        slidesOffsetBefore={10}
        slidesOffsetAfter={10}
        speed={500}
        rewind
        parallax
        navigation
        autoplay={{ delay: 5000, pauseOnMouseEnter: true }}
        zoom={{ maxRatio: MAX_ZOOM, minRatio: MIN_ZOOM }}
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