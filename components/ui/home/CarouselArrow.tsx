import { ChevronLeft, ChevronRight } from "lucide-react";

// Flecha de los carruseles de la Home (VA-82): el mismo control en Destacadas, Últimas
// publicaciones y Categorías. Botón cuadrado tipo "placa", borde fino y acento rojo al pasar.
// La maneja ScrollCarousel; en celular no se muestra (se desliza con el dedo) y en los extremos se oculta.
export function CarouselArrow({
  direction,
  onClick,
  disabled,
  className = "",
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Anterior" : "Siguiente"}
      className={`absolute top-1/2 z-20 flex max-sm:hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border border-[#001F58]/15 bg-white text-[#001F58] shadow-sm transition-colors hover:border-[#E70F1F] hover:text-[#E70F1F] disabled:pointer-events-none disabled:opacity-0 ${
        direction === "prev" ? "-left-3 sm:-left-5" : "-right-3 sm:-right-5"
      } ${className}`}
    >
      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
    </button>
  );
}
