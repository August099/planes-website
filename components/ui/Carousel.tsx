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
import "swiper/css/thumbs";
import "swiper/css/zoom";

import Image from "next/image";
import { X, Maximize } from "lucide-react";

type GalleryProps = {
  images: { url: string; alt?: string }[];
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const STEP = 0.15;

export function AircraftGallery({ images }: GalleryProps) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const zoomLevel = useRef(1);
  const [currentZoom, setCurrentZoom] = useState(1);

  // --- Lightbox ---
  const lightboxSwiperRef = useRef<SwiperType | null>(null);
  const lightboxContainerRef = useRef<HTMLDivElement | null>(null);
  const lightboxZoomLevel = useRef(1);
  const [lightboxCurrentZoom, setLightboxCurrentZoom] = useState(1);

  // Zoom con rueda del mouse — función genérica reutilizable
  const makeWheelHandler = (
    swiperRefObj: React.MutableRefObject<SwiperType | null>,
    zoomRef: React.MutableRefObject<number>,
    setZoomState: (v: number) => void
  ) => (e: WheelEvent) => {
    if (!swiperRefObj.current || (e.deltaY > 0 && zoomRef.current <= MIN_ZOOM)) return;
    e.preventDefault();

    const delta = e.deltaY < 0 ? STEP : -STEP;
    zoomRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current + delta));

    if (zoomRef.current <= MIN_ZOOM) {
      swiperRefObj.current.zoom.out();
      zoomRef.current = MIN_ZOOM;
    } else {
      swiperRefObj.current.zoom.in(zoomRef.current);
    }

    setZoomState(zoomRef.current);
  };

  // Wheel listener del carrusel principal
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = makeWheelHandler(swiperRef, zoomLevel, setCurrentZoom);
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, []);

  // Wheel listener del lightbox (solo cuando está abierto)
  useEffect(() => {
    if (!isFullscreenOpen) return;

    // Bloquear scroll del fondo
    document.body.style.overflow = "hidden";

    // Wheel listener del lightbox
    const container = lightboxContainerRef.current;
    const handler = container
      ? makeWheelHandler(lightboxSwiperRef, lightboxZoomLevel, setLightboxCurrentZoom)
      : null;

    if (container && handler) {
      container.addEventListener("wheel", handler, { passive: false });
    }

    return () => {
      document.body.style.overflow = "";
      if (container && handler) {
        container.removeEventListener("wheel", handler);
      }
    };
  }, [isFullscreenOpen]);

  const handleOpenFullscreen = (index: number) => {
    setActiveImageIndex(index);
    lightboxZoomLevel.current = 1;
    setLightboxCurrentZoom(1);
    setIsFullscreenOpen(true);
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200">
        {/* Carrusel Principal */}
        <Swiper
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          onZoomChange={(_swiper, scale) => {
            zoomLevel.current = scale;
            setCurrentZoom(scale);
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
          className="w-full aspect-[4/3] max-h-[520px]"
        >
          {images.map((image, index) => (
            <SwiperSlide key={index} className="flex items-center justify-center">
              <div className="relative w-full h-full flex items-center justify-center group swiper-zoom-container">
                <Image
                  src={image.url}
                  alt={image.alt ?? "Foto del avión"}
                  width={1200}
                  height={900}
                  priority={index === 0}
                  className="object-contain w-full h-full max-h-[520px]"
                />

                {currentZoom < 1.3 && (
                  <div
                    className="absolute bottom-4 right-4 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-2 cursor-pointer"
                    onClick={() => handleOpenFullscreen(index)}
                  >
                    <Maximize className="w-5 h-5" />
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Miniaturas */}
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

      {/* Visor Pantalla Completa (Lightbox) con el MISMO sistema de zoom */}
      {isFullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none">
          <button
            onClick={() => setIsFullscreenOpen(false)}
            className="absolute top-5 right-5 z-50 text-white bg-slate-800/80 hover:bg-slate-700 p-2.5 rounded-full transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="absolute top-5 left-5 z-50 text-slate-300 text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full border border-slate-800">
            Pellizca o usa la rueda del mouse para Zoom ({Math.round(lightboxCurrentZoom * 100)}%)
          </div>

          <div ref={lightboxContainerRef} className="w-full h-full">
            <Swiper
              onSwiper={(swiper) => (lightboxSwiperRef.current = swiper)}
              onZoomChange={(_swiper, scale) => {
                lightboxZoomLevel.current = scale;
                setLightboxCurrentZoom(scale);
              }}
              onSlideChange={(swiper) => setActiveImageIndex(swiper.activeIndex)}
              modules={[Navigation, Zoom]}
              navigation
              zoom={{ maxRatio: MAX_ZOOM, minRatio: MIN_ZOOM }}
              initialSlide={activeImageIndex}
              className="w-full h-full"
            >
              {images.map((image, index) => (
                <SwiperSlide key={index} className="flex items-center justify-center">
                  <div className="swiper-zoom-container w-full h-full flex items-center justify-center">
                    <Image
                      src={image.url}
                      alt={image.alt ?? "Imagen ampliada"}
                      width={1600}
                      height={1200}
                      className="object-contain max-w-full max-h-[90vh]"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      )}
    </>
  );
}