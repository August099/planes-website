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
import { X, Maximize, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { pauseYoutube, youtubeEmbedUrl } from "@/lib/youtube";

type GalleryProps = {
  images: { url: string; alt?: string | null }[];
  title: string;
  video?: string | null;
  fade?: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const STEP = 0.15;

export function AircraftGallery({ images, title, video = null, fade = false }: GalleryProps) {
  const [playing, setPlaying] = useState(false);
  const videoFrameRef = useRef<HTMLIFrameElement | null>(null);
  const slideCount = images.length + (video ? 1 : 0);
  const photoAlt = (image: { alt?: string | null }, index: number) => image.alt || `${title} – foto ${index + 1}`;

  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const mainSwiperRef = useRef<SwiperType | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const lightboxSwiperRef = useRef<SwiperType | null>(null);
  const lightboxContainerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lightboxZoomLevel = useRef(1);
  const [lightboxCurrentZoom, setLightboxCurrentZoom] = useState(1);

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
    pauseYoutube(videoFrameRef.current);
    setActiveImageIndex(index);
    lightboxZoomLevel.current = 1;
    setLightboxCurrentZoom(1);
    setIsFullscreenOpen(true);
  };

  return (
    <>
      <div className={`relative w-full rounded-lg overflow-hidden bg-white ${fade ? "" : "shadow-sm border border-slate-200"}`}>
        <div className="relative">
          <Swiper
            onSwiper={(swiper) => (mainSwiperRef.current = swiper)}
            onSlideChange={(swiper) => {
              // El loop reordena las diapositivas y un iframe movido se recarga con autoplay: al salir se desmonta.
              if (swiper.realIndex !== images.length) setPlaying(false);
            }}
            onClick={(swiper) => {
              // En modo loop, se usa realIndex para obtener la foto correcta
              if (swiper.realIndex < images.length) handleOpenFullscreen(swiper.realIndex);
            }}
            modules={[Autoplay, Parallax, Thumbs]}
            spaceBetween={10}
            slidesOffsetBefore={10}
            slidesOffsetAfter={10}
            speed={500}
            loop={slideCount > 1} // <-- CAMBIO CLAVE: Permite desplazamiento infinito en la misma dirección
            parallax
            autoplay={{ delay: 5000, pauseOnMouseEnter: true }}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            className="w-full aspect-[4/3] max-h-[520px]"
          >
            {images.map((image, index) => (
              <SwiperSlide key={index} className="flex items-center justify-center cursor-zoom-in">
                <div className="relative w-full h-full flex items-center justify-center group">
                  <AppImage
                    src={image.url}
                    alt={photoAlt(image, index)}
                    width={1200}
                    height={900}
                    priority={index === 0}
                    className="object-contain w-full h-full max-h-[520px]"
                  />

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
            {video && (
              <SwiperSlide key="video" className="flex items-center justify-center">
                <div className="relative flex h-full w-full items-center justify-center bg-[#001331]">
                  {playing ? (
                    <iframe
                      ref={videoFrameRef}
                      src={youtubeEmbedUrl(video)}
                      title={`Video de ${title}`}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <button type="button" onClick={(e) => {
                        e.stopPropagation();
                        // Sin esto, el autoplay del carrusel pasa a otra foto en medio del video.
                        mainSwiperRef.current?.autoplay?.stop();
                        setPlaying(true);
                      }} className="flex flex-col items-center gap-3 text-white cursor-pointer">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D62828]">
                        <Play className="ml-1 h-7 w-7" fill="currentColor" />
                      </span>
                      <span className="text-sm font-semibold">Ver video</span>
                      <span className="text-[11px] text-white/70">Se carga desde YouTube al tocarlo</span>
                    </button>
                  )}
                </div>
              </SwiperSlide>
            )}
          </Swiper>

          {/* Flechas de navegación redondas */}
          {slideCount > 1 && (
            <>
              <button
                type="button"
                onClick={() => mainSwiperRef.current?.slidePrev()}
                aria-label="Anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow-md cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6 pr-0.5" />
              </button>
              <button
                type="button"
                onClick={() => mainSwiperRef.current?.slideNext()}
                aria-label="Siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors shadow-md cursor-pointer"
              >
                <ChevronRight className="h-6 w-6 pl-0.5" />
              </button>
            </>
          )}
        </div>

        {/* Miniaturas */}
        {slideCount > 1 && (
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
              {video && (
                <SwiperSlide key="video" className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity !w-[calc((100%-32px)/5)] sm:!w-[calc((100%-48px)/7)] lg:!w-[calc((100%-64px)/9)]">
                  <div className="relative flex aspect-[4/3] items-center justify-center rounded-lg bg-[#001331] text-white" aria-label="Video">
                    <Play className="h-5 w-5" fill="currentColor" />
                  </div>
                </SwiperSlide>
              )}
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
              onSlideChange={(swiper) => setActiveImageIndex(swiper.realIndex)}
              modules={[Zoom, Keyboard]}
              keyboard={{ enabled: true }}
              zoom={{ maxRatio: MAX_ZOOM, minRatio: MIN_ZOOM, toggle: true }}
              loop={images.length > 1} // <-- También en el visor fullscreen
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
                <button
                  type="button"
                  onClick={() => lightboxSwiperRef.current?.slidePrev()}
                  aria-label="Anterior"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
                >
                  <ChevronLeft className="h-7 w-7 pr-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => lightboxSwiperRef.current?.slideNext()}
                  aria-label="Siguiente"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
                >
                  <ChevronRight className="h-7 w-7 pl-0.5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}