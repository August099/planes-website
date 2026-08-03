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
    highlight: "más aeronaves",
    subtitle: "Publicá y gestioná tus repuestos y aeronaves de forma ágil.",
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
    vertical: "40%",  
    horizontal: "75%", 
  },
  intervalMs = 4000,
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
    <section className="relative w-full h-screen min-h-[600px] overflow-hidden">
      <Image
        src="/bkg-home.png"
        alt="Fondo Ventas Aeronáuticas"
        fill
        priority
        className="object-cover object-center select-none"
        sizes="100vw"
      />

      {/* 2. Texto Flotante con Posicionamiento Dinámico */}
      <div
        className="absolute transition-all duration-300 -translate-x-1/2 -translate-y-1/2 px-6 sm:px-0 w-full max-w-lg md:max-w-xl"
        style={{
          top: positionConfig.vertical,
          left: positionConfig.horizontal,
        }}
      >
        {/* Animación pura de disolución (Fade in / Fade out) */}
        <div
          className={`transition-opacity duration-500 ${
            fadeState === "in" ? "opacity-100" : "opacity-0"
          }`}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-none">
            <span className="block text-white">
              {currentMsg.title}
            </span>
            
            {/* Texto de Blanco a Rojo */}
            <span className="block bg-gradient-to-r from-white via-red-100 to-[#E70F1F] bg-clip-text text-transparent">
              {currentMsg.highlight}
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-white font-medium drop-shadow">
            {currentMsg.subtitle}
          </p>
          {currentMsg.buttonText && (
            <div className="mt-6">
              <Link
                href={currentMsg.buttonLink}
                className="inline-flex items-center gap-2 bg-[#E70F1F] hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-red-900/30 transition-all duration-200 transform hover:-translate-y-0.5"
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