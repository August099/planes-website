import type { ReactNode } from "react";
import { FlightPaths } from "@/components/ui/home/FlightPaths";
import { BrandBars } from "@/components/ui/home/BrandBars";

// Encabezado de las páginas internas (rediseño moderno, 26/10).
// - "banner": banner redondeado con el degradé azul de la marca, rutas de vuelo animadas y las dos barras
//   del logo (como "Guías de ayuda" en la Home).
// - "plain": título azul con la regla roja debajo, sin banner (páginas secundarias).
// - "desktop-banner": banner desde md y título plano en celular (listados de aviones y repuestos).
// `compact` hace el banner menos alto; `aside` va a la derecha (por ejemplo, el orden del listado) y
// `children` debajo del texto.
type Variant = "banner" | "plain" | "desktop-banner";

// Clases según la variante: lo del banner va con prefijo md: en "desktop-banner".
const STYLES: Record<Variant, { box: string; title: string; muted: string; deco: string; rule: string }> = {
  banner: {
    box: "rounded-[28px] bg-[linear-gradient(120deg,#0A4C96_0%,#00205B_72%)] text-white shadow-[0_24px_50px_-28px_rgb(10_76_150/0.9)] ring-1 ring-white/10",
    title: "text-white",
    muted: "text-white/75",
    deco: "",
    rule: "hidden",
  },
  plain: {
    box: "",
    title: "text-[#00205B]",
    muted: "text-slate-500",
    deco: "hidden",
    rule: "",
  },
  "desktop-banner": {
    box: "md:rounded-[28px] md:bg-[linear-gradient(120deg,#0A4C96_0%,#00205B_72%)] md:text-white md:shadow-[0_24px_50px_-28px_rgb(10_76_150/0.9)] md:ring-1 md:ring-white/10",
    title: "text-[#00205B] md:text-white",
    muted: "text-slate-500 md:text-white/75",
    deco: "hidden md:block",
    rule: "md:hidden",
  },
};

export function PageHeader({
  title,
  count,
  subtitle,
  eyebrow,
  aside,
  children,
  compact = false,
  variant = "banner",
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
  variant?: Variant;
  /** id único de la ruta animada (SVG): una por página. */
  routeId: string;
  className?: string;
}) {
  const s = STYLES[variant];
  const banner = variant !== "plain";
  // Padding solo donde hay banner (en "desktop-banner", desde md).
  const pad = !banner
    ? ""
    : variant === "desktop-banner"
      ? compact
        ? "md:px-8 md:py-7"
        : "md:px-10 md:py-12"
      : compact
        ? "px-6 py-6 sm:px-8 sm:py-7"
        : "px-6 py-10 sm:px-10 sm:py-12";
  const size =
    variant === "plain" || variant === "desktop-banner"
      ? `text-[1.9rem] sm:text-[2.4rem] ${variant === "desktop-banner" && !compact ? "md:text-[3rem]" : ""}`
      : compact
        ? "text-[1.9rem] sm:text-[2.3rem]"
        : "text-[2.2rem] sm:text-[3rem]";

  return (
    <header className={`relative isolate overflow-hidden ${s.box} ${pad} ${className}`}>
      {banner && (
        <>
          <FlightPaths id={routeId} tone="dark" className={`-z-10 ${s.deco}`} />
          <BrandBars className={`right-[18%] -z-10 hidden ${variant === "desktop-banner" ? "md:block" : "sm:block"}`} />
        </>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className={`mb-2 text-[11px] font-bold uppercase tracking-[0.16em] ${s.muted}`}>{eyebrow}</p>}
          <h1 className={`va-h1-keep font-heading font-extrabold leading-[1.05] tracking-[-0.03em] ${s.title} ${size}`}>
            {title}
            {count !== undefined && (
              <span className={`ml-3 align-middle text-base font-semibold tracking-normal tabular-nums ${s.muted}`}>({count})</span>
            )}
          </h1>
          {/* Regla roja del título plano (en el banner no va). */}
          <span aria-hidden className={`mt-3 block h-[3px] w-[72px] rounded-full bg-gradient-to-r from-[#D62828] to-[#B71F1F] ${s.rule}`} />
          {subtitle && (
            <p
              className={`mt-3 max-w-2xl text-sm leading-relaxed sm:text-base ${
                variant === "plain" ? "text-slate-600" : variant === "desktop-banner" ? "text-slate-600 md:text-white/85" : "text-white/85"
              }`}
            >
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </header>
  );
}
