// Motivo del logo (26/10): dos barras inclinadas como las "//" de Ventas Aeronáuticas, una ancha y otra
// fina, en blanco translúcido. Van en un SVG con el mismo desplazamiento horizontal (40) en las dos, así
// quedan paralelas a cualquier alto (escalar en x e y no cambia el paralelismo). Decorativo; el contenedor
// tiene que tener `relative` y `overflow-hidden`.
export function BrandBars({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 110 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-y-0 h-full w-28 fill-white/12 sm:w-36 ${className}`}
    >
      <polygon points="40,0 74,0 34,100 0,100" />
      <polygon points="86,0 98,0 58,100 46,100" />
    </svg>
  );
}
