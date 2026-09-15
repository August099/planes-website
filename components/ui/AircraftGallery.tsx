"use client";

import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Parallax, Thumbs } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/parallax";
import "swiper/css/thumbs";

import Image from "next/image";
import { X, ZoomIn } from "lucide-react";

type GalleryProps = {
  images: { url: string; alt?: string }[];
};

export function AircraftGallery({ images }: GalleryProps) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxScale, setLightboxScale] = useState(1);

  const handleOpenFullscreen = (index: number) => {
    setActiveImageIndex(index);
    setLightboxScale(1);
    setIsFullscreenOpen(true);
  };

  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setLightboxScale((prev) => Math.min(4, Math.max(1, prev + delta)));
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-black">
        {/* Carrusel Principal */}
        <Swiper
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          modules={[Navigation, Autoplay, Parallax, Thumbs]}
          spaceBetween={0}
          speed={500}
          rewind
          parallax
          navigation
          autoplay={{ delay: 5000, pauseOnMouseEnter: true }}
          thumbs={{ swiper: thumbsSwiper }}
          className="w-full aspect-[4/3] max-h-[520px]"
        >
          {images.map((image, index) => (
            <SwiperSlide key={index} className="flex items-center justify-center bg-black">
              <div
                onClick={() => handleOpenFullscreen(index)}
                className="relative w-full h-full flex items-center justify-center cursor-zoom-in group"
              >
                <Image
                  src={image.url}
                  alt={image.alt ?? "Foto del avión"}
                  width={1200}
                  height={900}
                  priority={index === 0}
                  className="object-contain w-full h-full max-h-[520px]"
                />
                <div className="absolute bottom-4 right-4 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <ZoomIn className="w-5 h-5" />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Miniaturas: Fondo y bordes transparentes */}
        {images.length > 1 && (
          <div className="p-3 bg-transparent border-none">
            <Swiper
              onSwiper={setThumbsSwiper}
              modules={[Thumbs]}
              spaceBetween={8}
              slidesPerView={5}
              breakpoints={{
                640: { slidesPerView: 7 },
                1024: { slidesPerView: 9 },
              }}
              watchSlidesProgress
              className="w-full"
            >
              {images.map((image, index) => (
                <SwiperSlide key={index} className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-transparent border-0 shadow-none">
                    <Image
                      src={image.url}
                      alt={image.alt ?? "Miniatura"}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>

      {/* Visor Pantalla Completa (Lightbox) */}
      {isFullscreenOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-xs select-none"
          onWheel={handleWheelZoom}
        >
          <button
            onClick={() => setIsFullscreenOpen(false)}
            className="absolute top-5 right-5 z-50 text-white bg-slate-800/80 hover:bg-slate-700 p-2.5 rounded-full transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="absolute top-5 left-5 z-50 text-slate-300 text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full border border-slate-800">
            Pellizca o usa la rueda del mouse para Zoom ({Math.round(lightboxScale * 100)}%)
          </div>

          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <div
              className="transition-transform duration-100 ease-out max-w-full max-h-full"
              style={{ transform: `scale(${lightboxScale})` }}
            >
              <Image
                src={images[activeImageIndex]?.url}
                alt="Imagen ampliada"
                width={1600}
                height={1200}
                className="object-contain max-w-full max-h-[85vh]"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}