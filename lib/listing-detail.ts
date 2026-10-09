import type { AircraftDetail, SparePartDetail } from "@/lib/listing-data";
import { AIRCRAFT_CONDITION_LABELS, SPARE_PART_CONDITION_LABELS } from "@/lib/constants";

// Contenido del detalle de un aviso (VA-57): características con íconos y tablas de
// "Información adicional". Es la única fuente para la vista web y la de impresión, y ya
// viene sin filas ni tablas vacías.

export type FeatureIcon =
  | "trade"
  | "financing"
  | "negotiable"
  | "rent"
  | "passengers"
  | "certified"
  | "ifr"
  | "autopilot"
  | "aircon"
  | "oxygen"
  | "condition"
  | "stock"
  | "price"
  | "partNumber";

export interface Feature {
  icon: FeatureIcon;
  label: string;
  value?: string; // en negrita, después de "label:"
}

export interface DetailRowData {
  label: string;
  value?: string;
  list?: string[]; // se muestra como lista con viñetas
}

export interface DetailSection {
  title: string;
  rows: DetailRowData[];
}

const AIRCRAFT_CONDITION = AIRCRAFT_CONDITION_LABELS;
const SPARE_PART_CONDITION = SPARE_PART_CONDITION_LABELS;

// certDate se guarda como fecha (medianoche UTC): se formatea en UTC para no correr el día.
const formatDate = (d: Date) => d.toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const hours = (n: number | null | undefined) => (n != null ? `${n.toLocaleString("es-AR")} hs` : undefined);
const text = (s: string | null | undefined) => (s && s.trim() ? s.trim() : undefined);
const lines = (s: string | null | undefined) =>
  (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

function section(title: string, rows: (DetailRowData | false | null | undefined)[]): DetailSection | null {
  const kept = rows.filter(
    (r): r is DetailRowData => !!r && (r.value !== undefined || (r.list !== undefined && r.list.length > 0))
  );
  return kept.length ? { title, rows: kept } : null;
}

// --------------------------------------------------------------------------- Aeronave

export function aircraftFeatures(a: AircraftDetail): Feature[] {
  const f: (Feature | false)[] = [
    a.trade && { icon: "trade", label: "Acepta permuta", value: "Sí" },
    a.financing && { icon: "financing", label: "Financiación", value: "Sí" },
    a.negotiable && { icon: "negotiable", label: "Precio negociable", value: "Sí" },
    a.rent && { icon: "rent", label: "Posible alquiler" },
    a.passengers != null && a.passengers > 0 && { icon: "passengers", label: "Cant. pasajeros", value: String(a.passengers) },
    a.certified &&
      (a.certDate
        ? { icon: "certified", label: "Habilitado hasta", value: formatDate(a.certDate) }
        : { icon: "certified", label: "Habilitado", value: "Sí" }),
    // No habilitado pero con fecha cargada: se informa la fecha para no ocultar el dato.
    !a.certified && !!a.certDate && { icon: "certified", label: "Habilitación vencida el", value: formatDate(a.certDate) },
    a.avAaptoifr && { icon: "ifr", label: "Apto IFR" },
    a.avAutopilot && { icon: "autopilot", label: "Autopilot" },
    a.airconditioner && { icon: "aircon", label: "Aire acondicionado" },
    a.oxygen && { icon: "oxygen", label: "Sist. oxígeno en cabina" },
  ];
  return f.filter((x): x is Feature => !!x);
}

export function aircraftSections(a: AircraftDetail): DetailSection[] {
  const multipleEngines = a.engines.length > 1;
  const brand = a.brand?.name || a.customBrand;
  const model = a.model?.name || a.customModel;

  const sections: (DetailSection | null)[] = [
    section("General", [
      { label: "Marca", value: text(brand) },
      { label: "Modelo", value: text(model) },
      { label: "Variante", value: text(a.subModel?.name) },
      { label: "Año", value: String(a.year) },
      // VA-44: las horas se informan siempre (pueden faltar en Agrícola/Experimental/Proyecto).
      { label: "Horas totales", value: hours(a.totalTimeHours) ?? "No informadas" },
      { label: "Categoría", value: text(a.category?.name) },
      { label: "Estado", value: AIRCRAFT_CONDITION[a.condition] ?? a.condition },
    ]),
    ...a.engines.map((e, i) =>
      section(multipleEngines ? `Motor ${i + 1}` : "Motor", [
        { label: "Marca", value: text(e.brand) },
        { label: "Modelo", value: text(e.model) },
        { label: "Potencia", value: e.horsepower != null ? `${e.horsepower} HP` : undefined },
        { label: "Horas totales", value: hours(e.engineHours) },
        { label: "TBO", value: hours(e.TBO) },
        { label: "DURG / SMOH", value: hours(e.DURG) },
        { label: "Descripción", value: text(e.description) },
      ])
    ),
    ...a.propeller.map((p, i) =>
      section(multipleEngines ? `Hélice ${i + 1}` : "Hélice", [
        { label: "Marca", value: text(p.brand) },
        { label: "Modelo", value: text(p.model) },
        { label: "Horas totales", value: hours(p.propellerHours) },
        { label: "Descripción", value: text(p.description) },
      ])
    ),
    section("Aviónica / Equipamiento / Radio", [{ label: "Descripción", value: text(a.avDescription) }]),
    section("Equipamiento adicional", [{ label: "Descripción", list: lines(a.extraEquipment) }]),
    a.categoryId === "A" ? section("Implementos agrícolas", [{ label: "Descripción", value: text(a.agEquipment) }]) : null,
    section("Exterior", [{ label: "Descripción", value: text(a.extDescription) }]),
    section("Interior", [
      { label: "Cant. pasajeros", value: a.passengers != null && a.passengers > 0 ? String(a.passengers) : undefined },
      { label: "Descripción", value: text(a.intDescription) },
    ]),
  ];
  return sections.filter((s): s is DetailSection => !!s);
}

// --------------------------------------------------------------------------- Repuesto

export function sparePartCategoryPath(s: SparePartDetail): string[] {
  const leaf = s.category;
  const mid = leaf?.parent ?? null;
  const root = mid?.parent ?? null;
  return [root?.name, mid?.name, leaf?.name].filter((n): n is string => !!n);
}

export function sparePartFeatures(s: SparePartDetail): Feature[] {
  const f: (Feature | false)[] = [
    { icon: "condition", label: "Estado", value: SPARE_PART_CONDITION[s.condition] ?? s.condition },
    { icon: "stock", label: "Stock", value: `${s.stock} ${s.stock === 1 ? "unidad" : "unidades"}` },
    s.price === null
      ? { icon: "price", label: "Precio a consultar" }
      : { icon: "price", label: "Moneda", value: s.inPesos ? "Pesos (ARS)" : "Dólares (USD)" },
    !!text(s.partNumber) && { icon: "partNumber", label: "Nº de parte", value: s.partNumber! },
  ];
  return f.filter((x): x is Feature => !!x);
}

export function sparePartSections(s: SparePartDetail): DetailSection[] {
  const attributes = Object.entries((s.attributes as Record<string, unknown>) || {}).filter(
    ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
  );
  const sections: (DetailSection | null)[] = [
    section("General", [
      { label: "Marca", value: text(s.brand) },
      { label: "Nº de parte", value: text(s.partNumber) },
      { label: "Categoría", value: sparePartCategoryPath(s).join(" › ") || undefined },
      { label: "Estado", value: SPARE_PART_CONDITION[s.condition] ?? s.condition },
      { label: "Stock", value: `${s.stock} ${s.stock === 1 ? "unidad" : "unidades"}` },
    ]),
    section("Compatibilidad", [{ label: "Aeronaves compatibles", list: s.aircrafts ?? [] }]),
    section(
      "Atributos",
      attributes.map(([k, v]) => ({ label: k, value: Array.isArray(v) ? v.join(", ") : String(v) }))
    ),
  ];
  return sections.filter((x): x is DetailSection => !!x);
}

export function sparePartConditionLabel(condition: string): string {
  return SPARE_PART_CONDITION[condition] ?? condition;
}
