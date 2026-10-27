import { LogoSlashes } from "@/components/ui/LogoSlashes";

// Motivo del logo (26/10) de fondo en piezas rojas o azules: las "//" en blanco translúcido, con las
// proporciones del logo original (LogoSlashes, 27/10). Ocupa todo el alto del contenedor, que tiene que
// tener `relative` y `overflow-hidden`.
export function BrandBars({ className = "" }: { className?: string }) {
  return <LogoSlashes className={`pointer-events-none absolute inset-y-0 h-full text-white/12 ${className}`} />;
}
