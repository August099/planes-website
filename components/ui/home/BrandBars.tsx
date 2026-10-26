// Motivo del logo (26/10): dos barras inclinadas como las "//" de Ventas Aeronáuticas, una ancha y otra
// fina, en blanco translúcido. Decorativo; el contenedor tiene que tener `relative` y `overflow-hidden`.
export function BrandBars({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-y-0 flex ${className}`}>
      <span className="h-full w-20 bg-white/12 [clip-path:polygon(55%_0,100%_0,45%_100%,0_100%)] sm:w-28" />
      <span className="-ml-6 h-full w-10 bg-white/12 [clip-path:polygon(78%_0,100%_0,22%_100%,0_100%)] sm:-ml-8 sm:w-14" />
    </span>
  );
}
