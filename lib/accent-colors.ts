// VA-170: paleta cerrada de colores de acento para los detalles de los Brokers. Solo se usan en bordes,
// íconos de las tarjetas de datos clave y subrayados; los botones y las letras son siempre los de VA.
export const ACCENT_COLORS = {
  navy: { label: "Azul VA", hex: "#001F58" },
  red: { label: "Rojo VA", hex: "#E70F1F" },
  sky: { label: "Celeste", hex: "#0369A1" },
  teal: { label: "Verde azulado", hex: "#0F766E" },
  green: { label: "Verde", hex: "#15803D" },
  amber: { label: "Ámbar", hex: "#B45309" },
  slate: { label: "Grafito", hex: "#334155" },
  wine: { label: "Bordó", hex: "#9F1239" },
} as const;

export type AccentKey = keyof typeof ACCENT_COLORS;
export const ACCENT_KEYS = Object.keys(ACCENT_COLORS) as AccentKey[];

/** Color del acento guardado (o el azul de VA si no hay o no es de la paleta). */
export function accentHex(key: string | null | undefined): string {
  return key && key in ACCENT_COLORS ? ACCENT_COLORS[key as AccentKey].hex : ACCENT_COLORS.navy.hex;
}
