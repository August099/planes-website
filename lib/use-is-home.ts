"use client";

import { usePathname } from "next/navigation";

// La Home es estática con ISR (revalidate en app/page.tsx). Cuando Vercel la regenera, el payload
// trae la ruta interna "/index" en vez de "/" y usePathname la devuelve tal cual: el header quedaba
// blanco al recargar (el build local tiene "/" y no lo muestra). No existe una ruta /index propia.
export function useIsHome(): boolean {
  const pathname = usePathname();
  return pathname === "/" || pathname === "/index";
}
