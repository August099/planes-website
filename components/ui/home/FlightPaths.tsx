// Rediseño moderno (26/10): rutas de vuelo vectoriales de fondo. Curvas punteadas que avanzan y un avión
// chico que recorre la primera (SVG <animateMotion>, sin JS). Decorativo: aria-hidden y sin eventos.
// Con "reducir movimiento" las líneas quedan quietas y el avión no se muestra (.va-motion en globals.css).
export function FlightPaths({ id, tone = "light", className = "" }: { id: string; tone?: "light" | "dark"; className?: string }) {
  const stroke = tone === "dark" ? "rgb(255 255 255 / 0.22)" : "rgb(10 76 150 / 0.22)";
  const plane = tone === "dark" ? "#ffffff" : "#0A4C96";
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 420"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <path id={id} d="M-40 360 C 220 300, 360 80, 640 120 S 1020 300, 1240 60" fill="none" stroke={stroke} strokeWidth="1.5" className="va-dash" />
      <path d="M-40 140 C 180 220, 420 260, 700 230 S 1060 120, 1240 200" fill="none" stroke={stroke} strokeWidth="1" className="va-dash va-dash-slow" />
      <circle cx="640" cy="120" r="4" fill={stroke} />
      <circle cx="640" cy="120" r="12" fill="none" stroke={stroke} className="va-ping" />
      <g className="va-motion">
        <path d="M0 -6 L14 0 L0 6 L3 0 Z" fill={plane}>
          <animateMotion dur="16s" repeatCount="indefinite" rotate="auto">
            <mpath href={`#${id}`} />
          </animateMotion>
        </path>
      </g>
    </svg>
  );
}
