"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function PromoBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="relative w-full bg-gradient-to-r from-[hsl(357,89%,40%)] via-[hsl(357,89%,55%)] to-[hsl(357,89%,40%)] text-secondary">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-10 py-2.5 text-center text-sm font-medium sm:px-6">
        <span className="hidden sm:inline">🔥</span>
        <p className="leading-tight">
          <span className="font-semibold">Promo de lanzamiento:</span> 80% OFF
          en todos los planes — aprovechá para publicar tus aviones
        </p>
        <span className="hidden sm:inline">🔥</span>
      </div>

      <button
        onClick={() => setVisible(false)}
        aria-label="Cerrar banner"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-secondary/70 transition hover:bg-secondary/10 hover:text-secondary"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}