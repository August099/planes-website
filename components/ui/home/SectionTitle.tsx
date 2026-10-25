// Título de sección de la Home (VA-79). VA-115 (socio, 14/10): sin el "//" rojo delante del título.
// Rediseño (25/10): arriba, el número de sección en orden de aparición ("01 //", contador CSS de
// .home-theme); abajo, la escala de distancia de las cartas de navegación (.va-scale), que es el
// motivo que se repite en toda la web. Alineado a la izquierda.
export function SectionTitle({
  children,
  tone = "light",
  id,
  className = "",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  id?: string;
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={`va-section-title ${className}`}>
      <p aria-hidden className={`va-section-index text-[11px] font-semibold tracking-[0.18em] tabular-nums ${dark ? "text-[#FF8A8A]" : "text-[#D62828]"}`} />
      <h2
        id={id}
        className={`mt-2 text-[1.9rem] leading-[1.08] font-extrabold tracking-[-0.02em] sm:text-[2.35rem] ${dark ? "text-white" : "text-[#00205B]"}`}
      >
        {children}
      </h2>
      <span aria-hidden className={`va-scale ${dark ? "va-scale-dark" : ""}`} />
    </div>
  );
}
