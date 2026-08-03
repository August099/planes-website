"use client";

import { useState } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";

export function PromoBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="relative w-full bg-gradient-to-r from-[#990000] via-[#C51A1A] to-[#990000] text-white shadow-sm overflow-hidden border-b border-white/10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_70%)]" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-3 px-10 py-2.5 text-center text-sm font-medium sm:px-6">

        <p className="leading-tight text-white/95">
          ¡Publicá <span className="font-bold rgba(25, 39, 240, 0.15)">1 avión</span> y <span className="font-bold rgba(25, 39, 240, 0.15)">1 repuesto GRATIS</span> creando tu cuenta!
        </p>

        <a 
          href="#publicar" 
          className="hidden md:inline-flex items-center gap-1 font-semibold text-white hover:text-white/80 transition-colors underline decoration-white/50 underline-offset-4 text-xs uppercase tracking-wide ml-1"
        >
          Crear ahora
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      <button
        onClick={() => setVisible(false)}
        aria-label="Cerrar banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}