import { ChevronLeft, ChevronRight } from "lucide-react";

// Flecha de los carruseles de la Home (VA-82): el mismo control en Destacadas, Últimas
// publicaciones y Categorías. Botón cuadrado tipo "placa", borde fino y acento rojo al pasar.
// La usan ScrollCarousel y la galería del detalle (VA-160); en celular no se muestra (se desliza con el
// dedo) y en los extremos se oculta. placement "inside": dentro de la foto (la galería recorta lo de afuera).
export function CarouselArrow({
  direction,
  onClick,
  disabled,
  placement = "outside",
  className = "",
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
  placement?: "outside" | "inside";
  className?: string;
}) {
  const side =
    placement === "inside"
      ? direction === "prev"
        ? "left-3"
        : "right-3"
      : direction === "prev"
        ? "-left-3 sm:-left-5"
        : "-right-3 sm:-right-5";
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Anterior" : "Siguiente"}
      className={`absolute top-1/2 z-20 flex max-sm:hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border border-[#00205B]/15 bg-white text-[#00205B] shadow-sm transition-colors hover:border-[#D62828] hover:text-[#D62828] disabled:pointer-events-none disabled:opacity-0 ${side} ${className}`}
    >
      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
    </button>
  );
}
