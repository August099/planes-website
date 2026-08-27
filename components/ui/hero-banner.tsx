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
      {/* Imagen de Fondo */}
      <Image
        src="/bkg-home.png"
        alt="Fondo Ventas Aeronáuticas"
        fill
        priority
        className="object-cover object-right sm:object-center select-none"
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
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight md:leading-none whitespace-normal md:whitespace-nowrap">
            <span className="text-white">Bienvenido </span>
            <span className="bg-gradient-to-r from-white via-red-100 to-[#E70F1F] bg-clip-text text-transparent">
              a bordo
            </span>
          </h1>

          {/* Espaciador entre el texto y los filtros */}
          <span className="block h-6 sm:h-8 md:h-10" />

          <HomeHeroFilter />
        </div>
      </div>
    </section>
  );
}