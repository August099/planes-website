import type { ReactNode } from "react";

// Rediseño de la Home (25/10, v2): título de sección tipo revista. Número de sección grande y
// calado (contador CSS de .home-theme, el mismo que usa SectionTitle), título en mayúsculas y una
// regla de 2 px con el tramo rojo de la marca. `aside` va a la derecha desde sm (links de la sección).
export function DisplayTitle({
  children,
  tone = "light",
  id,
  align = "left",
  aside,
  mark,
  className = "",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  id?: string;
  align?: "left" | "center";
  aside?: ReactNode;
  /** En lugar del número de sección (no cuenta en la numeración): un ícono en el mismo tono tenue. */
  mark?: ReactNode;
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={`${mark ? "" : "va-section-title"} ${className}`}>
      <div className={`va-dt-row flex items-end gap-3 sm:gap-5 ${align === "center" ? "justify-center text-center" : ""}`}>
        {mark ? (
          <span aria-hidden className={`shrink-0 [&>svg]:h-12 [&>svg]:w-12 sm:[&>svg]:h-[4.5rem] sm:[&>svg]:w-[4.5rem] ${dark ? "text-white/20" : "text-[#00205B]/15"}`}>
            {mark}
          </span>
        ) : (
          <span aria-hidden className={`va-num shrink-0 text-[3.5rem] sm:text-[5.25rem] ${dark ? "va-num-dark" : ""}`} />
        )}
        <h2
          id={id}
          className={`va-dt-h pb-1 font-heading text-[1.6rem] leading-[0.95] font-black uppercase tracking-[-0.025em] sm:text-[2.6rem] ${dark ? "text-white" : "text-[#00205B]"}`}
        >
          {children}
        </h2>
        {aside && <div className="ml-auto hidden shrink-0 pb-1.5 sm:block">{aside}</div>}
      </div>
      <span aria-hidden className={`va-rule mt-4 ${dark ? "va-rule-dark" : ""}`} />
    </div>
  );
}

// Link de sección de la Home (rediseño moderno, 26/10): píldora con borde fino que se rellena de azul al pasar.
export const HOME_SQUARE_LINK =
  "va-sq inline-flex min-h-10 items-center rounded-full border border-[#00205B]/20 bg-white/80 px-5 text-xs font-bold uppercase tracking-[0.08em] text-[#00205B] shadow-sm transition-colors hover:border-[#00205B] hover:bg-[#00205B] hover:text-white";
