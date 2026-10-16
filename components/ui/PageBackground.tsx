import Image from "next/image";
import { PAGE_BACKGROUNDS, type PageBackgroundKey } from "@/lib/page-backgrounds";

// Fondo estándar de las páginas (VA-56): imagen fija en la pantalla (no se estira en páginas
// largas) con un filtro claro encima. El color del filtro es explícito para que no se vuelva
// oscuro si algún día se activa la clase .dark (--background cambia ahí).
export function PageBackground({
  page = "default",
  overlay = 85,
}: {
  page?: PageBackgroundKey;
  overlay?: number;
}) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* WebP ya comprimidos (scripts/optimize-backgrounds.mjs): se sirven tal cual, sin pasar por el
          optimizador (que en Next 16 solo acepta quality 75 por defecto y consume cupo en Vercel). */}
      <Image src={PAGE_BACKGROUNDS[page]} alt="" fill priority unoptimized sizes="100vw" className="object-cover" />
      <div className="absolute inset-0" style={{ backgroundColor: `hsl(210 60% 97% / ${overlay / 100})` }} />
    </div>
  );
}
