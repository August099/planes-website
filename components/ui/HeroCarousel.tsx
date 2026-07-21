"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const SLIDES = [
  {
    title: "Aviones agrícolas, directo entre particulares",
    subtitle: "Publicá o encontrá aviones agrícolas en toda Argentina.",
    cta: { label: "Ver aviones disponibles", href: "/aviones" },
  },
  {
    title: "Próximamente: repuestos y más variedad de aviones",
    subtitle: "Estamos preparando nuevas categorías para vos.",
    cta: null,
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="bg-secondary text-white py-20 px-4 text-center">
      <div className="max-w-xl mx-auto relative min-h-[190px]">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.title}
            className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700 ${
              i === active ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <h1 className="text-3xl md:text-4xl font-heading font-semibold mb-3">
              {slide.title}
            </h1>
            <p className="text-white/80 mb-6">{slide.subtitle}</p>
            {slide.cta && (
              <Link href={slide.cta.href}>
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  {slide.cta.label}
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Ver anuncio ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === active ? "w-6 bg-primary" : "w-2 bg-white/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}