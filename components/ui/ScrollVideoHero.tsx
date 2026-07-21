"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollVideoHero() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative h-[70vh] min-h-[420px] overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Filtro azul leve, del navy de la paleta */}
      <div className="absolute inset-0 bg-[#001F58]/25" />

      <div
        className={`relative h-full flex flex-col items-center justify-center text-center px-4 transition-all duration-1000 ${
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <h2 className="text-4xl md:text-6xl font-heading font-bold max-w-2xl bg-gradient-to-r from-white to-[#ff8a8a] bg-clip-text text-transparent leading-tight">
            Volar más alto, vender más rápido
        </h2>
      </div>
    </section>
  );
}