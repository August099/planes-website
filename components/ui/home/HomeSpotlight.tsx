"use client";

import { useEffect } from "react";

// Brillo de las fichas y tarjetas de la Home (estilo "Relieve", 26/10): pasa la posición del cursor a
// --mx/--my de la ficha que está debajo; el círculo de luz lo dibuja globals.css. Sin estado de React.
export function HomeSpotlight() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const tile = e.target instanceof Element ? (e.target.closest(".home-theme .va-tile, .home-theme .va-card") as HTMLElement | null) : null;
      if (!tile) return;
      const r = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", `${e.clientX - r.left}px`);
      tile.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
