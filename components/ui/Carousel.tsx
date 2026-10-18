"use client";
import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Parallax, Zoom, Thumbs, Keyboard } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/parallax";
import "swiper/css/thumbs";
import "swiper/css/zoom";

import { AppImage } from "@/components/ui/AppImage";
import { X, Maximize } from "lucide-react";
import { CarouselArrow } from "@/components/ui/home/CarouselArrow";

type GalleryProps = {
  images: { url: string; alt?: string | null }[];
  // Título del aviso: se usa para el alt de cada foto ("{título} – foto {n}").
  title: string;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const STEP = 0.15;

export function AircraftGallery({ images, title }: GalleryProps) {
  const photoAlt = (image: { alt?: string | null }, index: number) => image.alt || `${title} – foto ${index + 1}`;

  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  // VA-160: flechas propias (las mismas de la Home) en vez de las de Swiper.
  const mainSwiperRef = useRef<SwiperType | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // --- Lightbox ---
  const lightboxSwiperRef = useRef<SwiperType | null>(null);
  const lightboxContainerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lightboxZoomLevel = useRef(1);
  const [lightboxCurrentZoom, setLightboxCurrentZoom] = useState(1);

  // Lightbox abierto: bloquear el scroll del fondo, zoom con rueda (solo acá: en el carrusel
  // principal secuestraba el scroll de la página, VA-42) y Escape para cerrar.
  useEffect(() => {
    if (!isFullscreenOpen) return;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const container = lightboxContainerRef.current;
    const onWheel = (e: WheelEvent) => {
      const swiper = lightboxSwiperRef.current;
      if (!swiper || (e.deltaY > 0 && lightboxZoomLevel.current <= MIN_ZOOM)) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? STEP : -STEP;
      lightboxZoomLevel.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, lightboxZoomLevel.current + delta));
      if (lightboxZoomLevel.current <= MIN_ZOOM) {
        swiper.zoom.out();
        lightboxZoomLevel.current = MIN_ZOOM;
      } else {
        swiper.zoom.in(lightboxZoomLevel.current);
      }
      setLightboxCurrentZoom(lightboxZoomLevel.current);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreenOpen(false);
    };

    container?.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      container?.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
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
      {/* Mismo fondo que el resto de las tarjetas del detalle (VA-32): antes era transparente
          y alrededor de la foto y de las miniaturas se veía el fondo de la página. */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
        {/* Carrusel principal. Tocar o hacer clic en la foto abre la pantalla completa (VA-42):
            Swiper solo dispara onClick si no hubo arrastre, así que deslizar no la abre. */}
        <div className="relative">
        <Swiper
          onSwiper={(swiper) => (mainSwiperRef.current = swiper)}
          onClick={(swiper) => handleOpenFullscreen(swiper.activeIndex)}
          modules={[Autoplay, Parallax, Thumbs]}
          spaceBetween={10}
          slidesOffsetBefore={10}
          slidesOffsetAfter={10}
          speed={500}
          rewind
          parallax
          autoplay={{ delay: 5000, pauseOnMouseEnter: true }}
          thumbs={{ swiper: thumbsSwiper }}
          className="w-full aspect-[4/3] max-h-[520px]"
        >
          {images.map((image, index) => (
            <SwiperSlide key={index} className="flex items-center justify-center cursor-zoom-in">
              <div className="relative w-full h-full flex items-center justify-center group">
                {/* AppImage: si la foto no carga, muestra el placeholder en vez de un ícono roto. */}
                <AppImage
                  src={image.url}
                  alt={photoAlt(image, index)}
                  width={1200}
                  height={900}
                  priority={index === 0}
                  className="object-contain w-full h-full max-h-[520px]"
                />

                {/* Siempre visible en pantallas táctiles (no hay hover); en escritorio, al pasar el mouse. */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFullscreen(index);
                  }}
                  aria-label="Ver foto en pantalla completa"
                  className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center bg-black/60 text-white rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-2 cursor-pointer"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        {images.length > 1 && (
          <>
            <CarouselArrow direction="prev" placement="inside" onClick={() => mainSwiperRef.current?.slidePrev()} />
            <CarouselArrow direction="next" placement="inside" onClick={() => mainSwiperRef.current?.slideNext()} />
          </>
        )}
        </div>

        {/* Miniaturas */}
        {images.length > 1 && (
          <div className="p-3 bg-white border-t border-slate-100">
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
                // Ancho inicial igual al de slidesPerView (5 / 7 / 9): antes de que Swiper se inicialice,
                // la primera miniatura ocupaba todo el ancho y la tira "saltaba" (VA-32).
                <SwiperSlide key={index} className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity !w-[calc((100%-32px)/5)] sm:!w-[calc((100%-48px)/7)] lg:!w-[calc((100%-64px)/9)]">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-50 border-0 shadow-none">
                    <AppImage
                      src={image.url}
                      alt={photoAlt(image, index)}
                      fill
                      sizes="(min-width: 1024px) 120px, (min-width: 640px) 100px, 20vw"
                      className="object-cover rounded"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>

      {/* Visor de pantalla completa */}
      {isFullscreenOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos de ${title}`}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none"
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsFullscreenOpen(false)}
            aria-label="Cerrar"
            style={{ top: "max(1rem, env(safe-area-inset-top))" }}
            className="absolute right-4 z-50 flex h-11 w-11 items-center justify-center text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            style={{ top: "max(1rem, env(safe-area-inset-top))" }}
            className="absolute left-4 z-50 max-w-[calc(100%-6rem)] text-slate-300 text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full border border-slate-800"
          >
            <span className="lg:hidden">Pellizcá o tocá dos veces para hacer zoom</span>
            <span className="hidden lg:inline">Usá la rueda del mouse o hacé doble clic para hacer zoom</span>
            {lightboxCurrentZoom > 1 && ` (${Math.round(lightboxCurrentZoom * 100)}%)`}
          </div>

          <div ref={lightboxContainerRef} className="w-full h-full">
            <Swiper
              onSwiper={(swiper) => (lightboxSwiperRef.current = swiper)}
              onZoomChange={(_swiper, scale) => {
                lightboxZoomLevel.current = scale;
                setLightboxCurrentZoom(scale);
              }}
              onSlideChange={(swiper) => setActiveImageIndex(swiper.activeIndex)}
              modules={[Zoom, Keyboard]}
              keyboard={{ enabled: true }}
              zoom={{ maxRatio: MAX_ZOOM, minRatio: MIN_ZOOM, toggle: true }}
              initialSlide={activeImageIndex}
              className="w-full h-full"
            >
              {images.map((image, index) => (
                <SwiperSlide key={index} className="flex items-center justify-center">
                  <div className="swiper-zoom-container w-full h-full flex items-center justify-center">
                    <AppImage
                      src={image.url}
                      alt={photoAlt(image, index)}
                      width={1600}
                      height={1200}
                      className="object-contain max-w-full max-h-[90vh]"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            {images.length > 1 && (
              <>
                <CarouselArrow direction="prev" placement="inside" onClick={() => lightboxSwiperRef.current?.slidePrev()} />
                <CarouselArrow direction="next" placement="inside" onClick={() => lightboxSwiperRef.current?.slideNext()} />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
