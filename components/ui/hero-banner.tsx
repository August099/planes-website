"use client";

import { getImageProps } from "next/image";
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
  // Art direction (VA-73): un solo <img> dentro de <picture>. Antes había dos <Image priority>
  // (escritorio y celular) ocultos con CSS, y el navegador descargaba los dos en cualquier equipo.
  const common = { alt: "Fondo Ventas Aeronáuticas", sizes: "100vw", loading: "eager" as const };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: "/backgrounds/home2.webp", width: 1671, height: 941 });
  const {
    props: { srcSet: mobileSrcSet, ...imgProps },
  } = getImageProps({ ...common, src: "/backgrounds/home-mobile.webp", width: 940, height: 1672 });

  return (
    <section className="relative w-full h-screen min-h-[550px] sm:min-h-[600px] overflow-hidden">
      
      <picture>
        <source media="(min-width: 768px)" srcSet={desktopSrcSet} sizes="100vw" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- el alt viene en imgProps (getImageProps) */}
        <img
          {...imgProps}
          srcSet={mobileSrcSet}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center select-none"
        />
      </picture>

      {/* Sombreado suave solo para mejorar lectura en celulares */}
      <div className="absolute inset-0 bg-black/20 md:bg-transparent pointer-events-none" />

      {/* VA-79: la foto no termina en un borde recto; se funde con el celeste de la zona 1. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-16 sm:h-24 pointer-events-none bg-gradient-to-b from-transparent to-[#F5F5F5]"
      />

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
          {/* VA-55 (pedido del socio, 9/10): se mantiene el degradé blanco → rojo en "a bordo", sin
              recuadro oscuro detrás. El rojo final es más claro que el de marca (#D62828) para que
              se lea sobre el azul de la foto, y una sombra suave le da contraste. */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight md:leading-none whitespace-normal md:whitespace-nowrap drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
            <span className="text-white">Bienvenido </span>
            {/* VA-191: color plano en vez de texto con degradé. */}
            <span className="text-[#FF5A64]">a bordo</span>
          </h1>

          <span className="block h-6 sm:h-8 md:h-10" />

          <HomeHeroFilter />
        </div>
      </div>
    </section>
  );
}