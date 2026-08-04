"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const BANNER_MESSAGES = [
  {
    title: "Bienvenido a",
    highlight: "Ventas Aeronáuticas",
    subtitle: "El marketplace líder para la aviación general y comercial.",
    buttonText: "Ver aviones",
    buttonLink: "/planes",
  },
  {
    title: "Próximamente:",
    highlight: "servicios aeronáuticos",
    subtitle: "Encontrá mecánicos, fabricantes, hangares y más.",
  },
];

interface HeroBannerProps {
  positionConfig?: {
    vertical?: string;
    horizontal?: string;
  };
  intervalMs?: number;
}

export function HeroBanner({
  positionConfig = {
    vertical: "35%",  
    horizontal: "70%", 
  },
  intervalMs = 6000,
}: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  useEffect(() => {
    const timer = setInterval(() => {
      setFadeState("out");

      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % BANNER_MESSAGES.length);
        setFadeState("in");
      }, 500);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  const currentMsg = BANNER_MESSAGES[currentIndex];

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
        <div
          className={`transition-opacity duration-500 ${
            fadeState === "in" ? "opacity-100" : "opacity-0"
          }`}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight md:leading-none">
            <span className="block text-white">
              {currentMsg.title}
            </span>
            
            {/* Mobile: rompe línea si no entra / Desktop: mantenido en una sola línea */}
            <span className="block whitespace-normal md:whitespace-nowrap bg-gradient-to-r from-white via-red-100 to-[#E70F1F] bg-clip-text text-transparent">
              {currentMsg.highlight}
            </span>
          </h1>

          <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg-nowrap text-white font-medium drop-shadow-md max-w-md mx-auto md:mx-0">
            {currentMsg.subtitle}
          </p>

          {currentMsg.buttonText && (
            <div className="mt-5 sm:mt-6">
              <Link
                href={currentMsg.buttonLink}
                className="inline-flex items-center gap-2 bg-[#E70F1F] hover:bg-red-700 text-white font-semibold px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base rounded-lg shadow-lg hover:shadow-red-900/30 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                {currentMsg.buttonText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}