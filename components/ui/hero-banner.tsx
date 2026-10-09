"use client";

import Image from "next/image";
import HomeHeroFilter from "./HomeFilter";

interface HeroBannerProps {
  positionConfig?: {
    vertical?: string;
    horizontal?: string;
  };
}

export function HeroBanner({
  positionConfig = {
    vertical: "50%",  
    horizontal: "70%", 
  },
}: HeroBannerProps) {
  return (
    <section className="relative w-full h-screen min-h-[550px] sm:min-h-[600px] overflow-hidden">
      
      {/* Imagen de Fondo (Escritorio) */}
      <Image
        src="/bkg-home2.png"
        alt="Fondo Ventas Aeronáuticas"
        fill
        priority
        className="hidden md:block object-cover object-center select-none"
        sizes="100vw"
      />

      {/* Imagen de Fondo (Celulares) */}
      <Image
        src="/bkg-home-mobile.png"
        alt="Fondo Ventas Aeronáuticas Mobile"
        fill
        priority
        className="block md:hidden object-cover object-center select-none"
        sizes="100vw"
      />

      {/* Sombreado suave solo para mejorar lectura en celulares */}
      <div className="absolute inset-0 bg-black/20 md:bg-transparent pointer-events-none" />

      {/* Contenedor del Texto */}
      <div
        className="absolute transition-all duration-300 
                   /* Mobile: Centrado al medio de la pantalla */
                   top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 w-full max-w-md text-center
                   /* Desktop (md: en adelante): Respeta la posición del style */
                   md:top-[var(--desktop-top)] md:left-[var(--desktop-left)] md:text-left md:w-auto md:max-w-2xl lg:max-w-4xl md:px-0"
        style={
          {
            "--desktop-top": positionConfig.vertical,
            "--desktop-left": positionConfig.horizontal,
          } as React.CSSProperties
        }
      >
        <div className="relative isolate">
          {/* Difuminado oscuro detrás del bloque de texto (VA-55, composición): el título se lee
              sobre cualquier parte de la foto sin tapar la imagen. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10 rounded-[3rem] bg-black/40 blur-2xl"
          />
          {/* Un solo color (VA-55): antes "a bordo" tenía un degradé blanco → rojo que se leía mal. */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight md:leading-none whitespace-normal md:whitespace-nowrap text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            Bienvenido a bordo
          </h1>

          <span className="block h-6 sm:h-8 md:h-10" />

          <HomeHeroFilter />
        </div>
      </div>
    </section>
  );
}