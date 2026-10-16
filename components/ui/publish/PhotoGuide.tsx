import { Check } from "lucide-react";

// VA-124: guía de fotos del avión con plantillas dibujadas (antes era una lista de texto). Se ve
// siempre, también después de subir fotos: la plantilla N se marca cuando ya hay N fotos, así el
// orden sugerido queda claro (la primera es la portada).
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const SHOTS: { label: string; svg: React.ReactNode }[] = [
  {
    label: "Portada: ¾ de frente",
    svg: (
      <g {...S}>
        <path d="M8 27 L60 18 L66 21 L14 32 Z" />
        <path d="M20 41 Q22 33 32 32 L78 22 L80 26 L36 45 Q24 49 20 41 Z" />
        <ellipse cx="24" cy="41" rx="5" ry="6" />
        <ellipse cx="19" cy="41" rx="1.5" ry="13" strokeDasharray="2 2" />
        <path d="M74 23 L80 9 L85 10 L82 24" />
        <path d="M70 26 L90 21" />
        <path d="M27 47 L26 53" />
        <circle cx="26" cy="55" r="2.5" />
        <path d="M46 41 L47 49" />
        <circle cx="47" cy="51" r="2.2" />
      </g>
    ),
  },
  {
    label: "¾ trasero",
    svg: (
      <g {...S}>
        <path d="M26 44 L72 30 Q84 27 86 33 Q84 40 72 40 L30 48 Z" />
        <path d="M20 45 L14 16 L24 16 L32 42" />
        <path d="M4 44 L44 37" />
        <path d="M48 35 L92 23 L94 27 L54 40 Z" />
        <path d="M62 40 L63 48" />
        <circle cx="63" cy="50" r="2.2" />
      </g>
    ),
  },
  {
    label: "Laterales",
    svg: (
      <g {...S}>
        <path d="M10 36 Q14 30 26 30 L70 31 L86 26 L88 34 L70 38 L26 41 Q14 41 10 36 Z" />
        <path d="M28 26 H56 V29 H28 Z" />
        <path d="M36 40 L44 29" />
        <path d="M78 31 L84 18 L90 18 L88 31" />
        <path d="M76 34 L92 33" />
        <path d="M9 25 V47" />
        <path d="M31 32 H41 V36 H31 Z" />
        <path d="M24 41 L22 48" />
        <circle cx="22" cy="50" r="2.5" />
        <path d="M58 39 L60 46" />
        <circle cx="60" cy="48" r="2.2" />
      </g>
    ),
  },
  {
    label: "Tablero",
    svg: (
      <g {...S}>
        <rect x="8" y="14" width="80" height="30" rx="4" />
        <circle cx="22" cy="26" r="6" />
        <circle cx="38" cy="26" r="6" />
        <circle cx="54" cy="26" r="6" />
        <circle cx="70" cy="26" r="6" />
        <path d="M22 26 L25 23 M38 26 L38 22 M54 26 L57 28 M70 26 L67 23" />
        <path d="M16 37 H30 M36 37 H60 M66 37 H80" />
        <path d="M36 52 Q48 46 60 52 M48 44 V50" />
      </g>
    ),
  },
  {
    label: "Tapizado",
    svg: (
      <g {...S}>
        <path d="M14 52 V22 Q14 17 19 17 H24 Q28 17 28 22 V40 H42 Q46 40 46 44 V52 Z" />
        <path d="M50 52 V22 Q50 17 55 17 H60 Q64 17 64 22 V40 H78 Q82 40 82 44 V52 Z" />
        <path d="M18 24 H24 M54 24 H60" />
      </g>
    ),
  },
  {
    label: "Motor",
    svg: (
      <g {...S}>
        <rect x="34" y="22" width="28" height="24" rx="3" />
        <circle cx="48" cy="15" r="4" />
        <path d="M48 19 V22" />
        <rect x="12" y="22" width="20" height="10" rx="1.5" />
        <rect x="12" y="35" width="20" height="10" rx="1.5" />
        <rect x="64" y="22" width="20" height="10" rx="1.5" />
        <rect x="64" y="35" width="20" height="10" rx="1.5" />
        <path d="M17 22 V32 M22 22 V32 M27 22 V32 M17 35 V45 M22 35 V45 M27 35 V45" />
        <path d="M69 22 V32 M74 22 V32 M79 22 V32 M69 35 V45 M74 35 V45 M79 35 V45" />
        <path d="M40 50 H56" />
      </g>
    ),
  },
  {
    label: "Detalles",
    svg: (
      <g {...S}>
        <circle cx="40" cy="28" r="15" />
        <path d="M51 39 L66 54" strokeWidth={3} />
        <circle cx="40" cy="28" r="7" />
        <circle cx="40" cy="28" r="2.5" />
        <path d="M24 46 H14 M76 18 H86 M76 24 H84" />
      </g>
    ),
  },
];

export function PhotoGuide({ uploaded }: { uploaded: number }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Fotos sugeridas, en este orden</p>
      <ol className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {SHOTS.map((shot, i) => {
          const done = uploaded > i;
          return (
            <li
              key={shot.label}
              className={`relative flex w-24 shrink-0 flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center ${
                done ? "border-[#001F58]/30 bg-[#001F58]/5 text-[#001F58]" : "border-dashed border-[#001F58]/25 bg-white text-[#001F58]/70"
              }`}
            >
              <svg viewBox="0 0 96 64" className="h-12 w-full" aria-hidden>
                {shot.svg}
              </svg>
              <span className="text-[10px] font-semibold leading-tight">
                <span className="tabular-nums text-[#E70F1F]">{String(i + 1).padStart(2, "0")}</span> {shot.label}
              </span>
              {done && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#001F58] text-white" aria-label="Foto cargada">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
