"use client";

import { useEffect, useState } from "react";

const HERO_TITLES = [
  "Volar más alto, vender más rápido",
  "Próximamente: nuevos segmentos de aeronaves",
];

export function ScrollVideoHero() {
  const [titleIndex, setTitleIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Inicia Fade Out
      setFadeState("out");

      // 2. Transición de 500ms antes de cambiar el texto
      setTimeout(() => {
        setTitleIndex((prev) => (prev + 1) % HERO_TITLES.length);
        setFadeState("in");
      }, 500);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-[70vh] min-h-[420px] overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[#001F58]/35" />

      <div className="relative h-full flex items-center justify-center text-center px-4">
        <div className="max-w-3xl min-h-[120px] flex items-center justify-center">
          <h2
            className={`text-3xl sm:text-4xl md:text-6xl font-heading font-bold bg-gradient-to-r from-white to-[#ff8a8a] bg-clip-text text-transparent leading-tight transition-all duration-500 transform ${
              fadeState === "in"
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2"
            }`}
          >
            {HERO_TITLES[titleIndex]}
          </h2>
        </div>
      </div>
    </section>
  );
}