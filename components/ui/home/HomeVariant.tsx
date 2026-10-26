"use client";

import { useEffect } from "react";

// Maqueta temporal del rediseño (26/10): /?v=a ("Relieve") y /?v=b ("Cabina") para comparar dos
// direcciones sobre la misma Home. Pone data-hv en <html>; los estilos están en globals.css
// ("Variantes de la Home"). En la variante A, además, el brillo de las fichas sigue al cursor.
// Se borra cuando se elija una.
export function HomeVariant() {
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    const root = document.documentElement;
    if (v !== "a" && v !== "b") return;
    root.dataset.hv = v;
    if (v !== "a") return () => void delete root.dataset.hv;

    const onMove = (e: PointerEvent) => {
      const tile = e.target instanceof Element ? (e.target.closest(".va-tile, .va-card") as HTMLElement | null) : null;
      if (!tile) return;
      const r = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", `${e.clientX - r.left}px`);
      tile.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      delete root.dataset.hv;
    };
  }, []);
  return null;
}
