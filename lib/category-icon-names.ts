// VA-148: los 14 íconos de categorías de repuestos (components/icons/category/). El admin de
// taxonomía elige entre estos nombres y las actions solo aceptan estos (o ninguno). Sin dependencias:
// lo usan el cliente (selector del admin) y el servidor (validación).
export const CATEGORY_ICON_OPTIONS = [
  { value: "AceiteraIcon", label: "Aceitera" },
  { value: "AircraftIcon", label: "Avión" },
  { value: "AgriculturalAircraftIcon", label: "Avión agrícola" },
  { value: "CombustibleIcon", label: "Combustible" },
  { value: "FrenosIcon", label: "Frenos" },
  { value: "GpsIcon", label: "GPS" },
  { value: "HeadsetIcon", label: "Headset" },
  { value: "HeliceIcon", label: "Hélice" },
  { value: "HerramientasIcon", label: "Herramientas" },
  { value: "InstrumentosVueloIcon", label: "Instrumentos de vuelo" },
  { value: "LucesElectricosIcon", label: "Luces y eléctricos" },
  { value: "MotorIcon", label: "Motor" },
  { value: "RuedaIcon", label: "Rueda" },
  { value: "TornilloTuercaIcon", label: "Tornillo y tuerca" },
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_OPTIONS)[number]["value"];

/** Nombre válido o null (vacío o desconocido). */
export function parseCategoryIconName(value: unknown): CategoryIconName | null {
  const v = typeof value === "string" ? value.trim() : "";
  return CATEGORY_ICON_OPTIONS.some((o) => o.value === v) ? (v as CategoryIconName) : null;
}
