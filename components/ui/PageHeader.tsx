import type { ReactNode } from "react";
import { FlightPaths } from "@/components/ui/home/FlightPaths";
import { BrandBars } from "@/components/ui/home/BrandBars";

// Encabezado de las páginas internas (rediseño moderno, 26/10): banner redondeado con el degradé azul de
// la marca (como "Guías de ayuda" en la Home), rutas de vuelo animadas y las dos barras del logo. El
// título es el h1 de la página. `compact` para los listados (menos alto); `aside` va a la derecha
// (por ejemplo, el orden del listado) y `children` debajo del texto.
export function PageHeader({
  title,
  count,
  subtitle,
  eyebrow,
  aside,
  children,
  compact = false,
  routeId,
  className = "",
}: {
  title: ReactNode;
  /** Cantidad de resultados, al lado del título (listados). */
  count?: number;
  subtitle?: ReactNode;
  /** Rótulo chico arriba del título. */
  eyebrow?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  /** id único de la ruta animada (SVG): una por página. */
  routeId: string;
  className?: string;
}) {
  return (
    <header
      className={`relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(120deg,#0A4C96_0%,#00205B_72%)] text-white shadow-[0_24px_50px_-28px_rgb(10_76_150/0.9)] ring-1 ring-white/10 ${
        compact ? "px-6 py-6 sm:px-8 sm:py-7" : "px-6 py-10 sm:px-10 sm:py-12"
      } ${className}`}
    >
      <FlightPaths id={routeId} tone="dark" className="-z-10" />
      <BrandBars className="right-[18%] -z-10 hidden sm:block" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">{eyebrow}</p>}
          <h1
            className={`va-h1-keep font-heading font-extrabold leading-[1.05] tracking-[-0.03em] text-white ${
              compact ? "text-[1.9rem] sm:text-[2.3rem]" : "text-[2.2rem] sm:text-[3rem]"
            }`}
          >
            {title}
            {count !== undefined && (
              <span className="ml-3 align-middle text-base font-semibold tracking-normal text-white/70 tabular-nums">({count})</span>
            )}
          </h1>
          {subtitle && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">{subtitle}</p>}
          {children}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </header>
  );
}
