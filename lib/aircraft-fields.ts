import type { AircraftDetail } from "@/lib/listing-data";
import { AIRCRAFT_CONDITION_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

// VA-83: única lista de campos de una aeronave, con sus etiquetas y sección. La usan el detalle
// (lib/listing-detail.ts, web e impresión) y el comparador (/planes/compare). Un campo nuevo del
// formulario de publicar se agrega acá y aparece en los dos lugares.
//
// - value: el texto para mostrar; undefined = sin dato ("—" en el comparador, se omite en el detalle).
// - list: valor como lista (equipamiento, documentos).
// - numeric + best: para marcar el mejor valor en el comparador (solo filas objetivas).
// - inDetail: "row" = fila de la ficha; "feature" = ícono en "Características"; "summary" = va en
//   el resumen de arriba (la ficha web no lo repite); "none" = no se muestra en la ficha.

export type AircraftSectionKey =
  | "caracteristicas"
  | "general"
  | "motor"
  | "helice"
  | "avionica"
  | "equipamiento"
  | "exterior"
  | "interior"
  | "implementos"
  | "documentacion"
  | "venta";

// Mismo orden y etiquetas en el detalle y en el comparador.
export const AIRCRAFT_SECTIONS: { key: AircraftSectionKey; title: string }[] = [
  { key: "caracteristicas", title: "Características" },
  { key: "general", title: "General" },
  { key: "motor", title: "Motor" },
  { key: "helice", title: "Hélice" },
  { key: "avionica", title: "Aviónica / Equipamiento / Radio" },
  { key: "equipamiento", title: "Equipamiento adicional" },
  { key: "exterior", title: "Exterior" },
  { key: "interior", title: "Interior" },
  { key: "implementos", title: "Implementos agrícolas" },
  { key: "documentacion", title: "Documentación" },
  { key: "venta", title: "Condiciones de venta" },
];

export type Best = "min" | "max";

export interface AircraftField<T = AircraftDetail> {
  key: string;
  section: AircraftSectionKey;
  label: string;
  value?: (a: T) => string | undefined;
  list?: (a: T) => string[];
  numeric?: (a: T) => number | undefined;
  best?: Best;
  inDetail: "row" | "feature" | "summary" | "none";
  helpHref?: string;
  /** Texto del comparador cuando no hay dato (si no, "—"). VA-105 · 5.8: la matrícula es opcional. */
  compareEmpty?: string;
  /** Solo se muestra si la condición se cumple (por ejemplo, implementos solo en Agrícola). */
  when?: (a: T) => boolean;
}

// certDate se guarda como fecha (medianoche UTC): se formatea en UTC para no correr el día.
export const formatDate = (d: Date) =>
  d.toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
export const hours = (n: number | null | undefined) => (n != null ? `${n.toLocaleString("es-AR")} hs` : undefined);
export const text = (s: string | null | undefined) => (s && s.trim() ? s.trim() : undefined);
export const lines = (s: string | null | undefined) =>
  (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
const yesNo = (b: boolean | null | undefined) => (b ? "Sí" : "No");

export const aircraftBrand = (a: AircraftDetail) => text(a.brand?.name || a.customBrand);
export const aircraftModel = (a: AircraftDetail) => text(a.model?.name || a.customModel);

export const AIRCRAFT_FIELDS: AircraftField[] = [
  // Características
  {
    key: "certified",
    section: "caracteristicas",
    label: "Habilitación",
    inDetail: "feature",
    value: (a) =>
      a.certified
        ? a.certDate
          ? `Vigente hasta ${formatDate(a.certDate)}`
          : "Habilitado"
        : a.certDate
          ? `Vencida el ${formatDate(a.certDate)}`
          : "No",
  },
  { key: "avAaptoifr", section: "caracteristicas", label: "Apto IFR", inDetail: "feature", value: (a) => yesNo(a.avAaptoifr) },
  { key: "avAutopilot", section: "caracteristicas", label: "Autopilot", inDetail: "feature", value: (a) => yesNo(a.avAutopilot) },
  { key: "airconditioner", section: "caracteristicas", label: "Aire acondicionado", inDetail: "feature", value: (a) => yesNo(a.airconditioner) },
  { key: "oxygen", section: "caracteristicas", label: "Sist. oxígeno en cabina", inDetail: "feature", value: (a) => yesNo(a.oxygen) },

  // General
  { key: "brand", section: "general", label: "Marca", inDetail: "summary", value: aircraftBrand },
  { key: "model", section: "general", label: "Modelo", inDetail: "summary", value: aircraftModel },
  { key: "subModel", section: "general", label: "Variante", inDetail: "summary", value: (a) => text(a.subModel?.name) },
  { key: "year", section: "general", label: "Año", inDetail: "summary", value: (a) => String(a.year), numeric: (a) => a.year, best: "max" },
  {
    key: "totalTimeHours",
    section: "general",
    label: "Horas totales",
    inDetail: "summary",
    // VA-44: las horas se informan siempre (pueden faltar en Agrícola/Experimental/Proyecto).
    value: (a) => hours(a.totalTimeHours) ?? "No informadas",
    numeric: (a) => a.totalTimeHours ?? undefined,
    best: "min",
  },
  { key: "category", section: "general", label: "Categoría", inDetail: "summary", value: (a) => text(a.category?.name) },
  { key: "condition", section: "general", label: "Estado", inDetail: "summary", value: (a) => AIRCRAFT_CONDITION_LABELS[a.condition] ?? a.condition },
  // VA-113 (D13): la matrícula va en la ficha de abajo (si se cargó), no en "Datos de la aeronave".
  { key: "plate", section: "general", label: "Matrícula", inDetail: "row", value: (a) => text(a.plate)?.toUpperCase(), compareEmpty: "No informada" },
  { key: "description", section: "general", label: "Descripción", inDetail: "none", value: (a) => text(a.description) },

  // Aviónica, equipamiento, exterior, interior, implementos
  { key: "avDescription", section: "avionica", label: "Descripción", inDetail: "row", value: (a) => text(a.avDescription) },
  { key: "extraEquipment", section: "equipamiento", label: "Descripción", inDetail: "row", list: (a) => lines(a.extraEquipment) },
  { key: "extDescription", section: "exterior", label: "Descripción", inDetail: "row", value: (a) => text(a.extDescription) },
  {
    key: "passengers",
    section: "interior",
    label: "Cant. pasajeros",
    inDetail: "row",
    value: (a) => (a.passengers != null && a.passengers > 0 ? String(a.passengers) : undefined),
  },
  { key: "intDescription", section: "interior", label: "Descripción", inDetail: "row", value: (a) => text(a.intDescription) },
  {
    key: "agEquipment",
    section: "implementos",
    label: "Descripción",
    inDetail: "row",
    value: (a) => text(a.agEquipment),
    when: (a) => a.categoryId === "A",
  },

  // Documentación (en el detalle va como bloque de archivos aparte)
  // VA-105 · 5.7: la documentación es privada: en el comparador solo la cantidad, no los nombres.
  { key: "documents", section: "documentacion", label: "Documentos adjuntos", inDetail: "none", value: (a) => (a.documents.length ? `${a.documents.length} (privados, los ve el vendedor)` : undefined) },

  // Condiciones de venta
  {
    key: "price",
    section: "venta",
    label: "Precio",
    inDetail: "none",
    value: (a) => formatPrice(a.price, { fallback: "A consultar" }),
    numeric: (a) => (a.price != null && Number(a.price) > 0 ? Number(a.price) : undefined),
    best: "min",
  },
  { key: "financing", section: "venta", label: "Financiación", inDetail: "feature", value: (a) => yesNo(a.financing) },
  { key: "trade", section: "venta", label: "Acepta permuta", inDetail: "feature", value: (a) => yesNo(a.trade) },
  { key: "rent", section: "venta", label: "Posible alquiler", inDetail: "feature", value: (a) => yesNo(a.rent) },
  { key: "negotiable", section: "venta", label: "Precio negociable", inDetail: "feature", value: (a) => yesNo(a.negotiable) },
];

type Engine = AircraftDetail["engines"][number];
type Propeller = AircraftDetail["propeller"][number];

export const ENGINE_FIELDS: { key: string; label: string; value: (e: Engine) => string | undefined; numeric?: (e: Engine) => number | undefined; best?: Best; helpHref?: string }[] = [
  { key: "brand", label: "Marca", value: (e) => text(e.brand) },
  { key: "model", label: "Modelo", value: (e) => text(e.model) },
  { key: "horsepower", label: "Potencia", value: (e) => (e.horsepower != null ? `${e.horsepower} HP` : undefined) },
  { key: "engineHours", label: "Horas totales", value: (e) => hours(e.engineHours), numeric: (e) => e.engineHours ?? undefined, best: "min" },
  { key: "TBO", label: "TBO", value: (e) => hours(e.TBO) },
  {
    key: "DURG",
    label: "DURG / SMOH",
    value: (e) => hours(e.DURG),
    numeric: (e) => e.DURG ?? undefined,
    best: "min",
    helpHref: "/services/guides/aviation-glossary#smoh",
  },
  { key: "description", label: "Descripción", value: (e) => text(e.description) },
];

export const PROPELLER_FIELDS: { key: string; label: string; value: (p: Propeller) => string | undefined; numeric?: (p: Propeller) => number | undefined; best?: Best }[] = [
  { key: "brand", label: "Marca", value: (p) => text(p.brand) },
  { key: "model", label: "Modelo", value: (p) => text(p.model) },
  { key: "propellerHours", label: "Horas totales", value: (p) => hours(p.propellerHours), numeric: (p) => p.propellerHours ?? undefined, best: "min" },
  { key: "description", label: "Descripción", value: (p) => text(p.description) },
];
