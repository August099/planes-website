import type { AircraftDetail, SparePartDetail } from "@/lib/listing-data";
import { SPARE_PART_CONDITION_LABELS } from "@/lib/constants";
import { AIRCRAFT_FIELDS, AIRCRAFT_SECTIONS, ENGINE_FIELDS, PROPELLER_FIELDS, formatDate, text } from "@/lib/aircraft-fields";
import { categoryDef } from "@/lib/aircraft-categories";

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
  helpHref?: string; // ícono de ayuda junto a la etiqueta (VA-78: glosario)
}

export interface DetailSection {
  title: string;
  rows: DetailRowData[];
}

const SPARE_PART_CONDITION = SPARE_PART_CONDITION_LABELS;

function section(title: string, rows: (DetailRowData | false | null | undefined)[]): DetailSection | null {
  const kept = rows.filter(
    (r): r is DetailRowData => !!r && (r.value !== undefined || (r.list !== undefined && r.list.length > 0))
  );
  return kept.length ? { title, rows: kept } : null;
}

// --------------------------------------------------------------------------- Aeronave
// VA-83: los campos, etiquetas y secciones salen de lib/aircraft-fields.ts (los comparte el
// comparador). Acá solo se decide cómo se muestran en el detalle.

const FEATURE_ICONS: Record<string, FeatureIcon> = {
  trade: "trade",
  financing: "financing",
  negotiable: "negotiable",
  rent: "rent",
  passengers: "passengers",
  certified: "certified",
  avAaptoifr: "ifr",
  avAutopilot: "autopilot",
  airconditioner: "aircon",
  oxygen: "oxygen",
};
// Orden de los íconos en "Características" (condiciones de venta primero, como antes).
const FEATURE_ORDER = ["trade", "financing", "negotiable", "rent", "passengers", "certified", "avAaptoifr", "avAutopilot", "airconditioner", "oxygen"];
// Estos se leen mejor con "Sí" después de la etiqueta; el resto, solo la etiqueta.
const FEATURE_WITH_YES = new Set(["trade", "financing", "negotiable"]);

const fieldByKey = new Map(AIRCRAFT_FIELDS.map((f) => [f.key, f]));

export function aircraftFeatures(a: AircraftDetail): Feature[] {
  const out: Feature[] = [];
  for (const key of FEATURE_ORDER) {
    const icon = FEATURE_ICONS[key];
    if (key === "passengers") {
      const v = fieldByKey.get("passengers")!.value!(a);
      if (v) out.push({ icon, label: "Cant. pasajeros", value: v });
      continue;
    }
    if (key === "certified") {
      // Habilitado (con o sin fecha) o, si no, la fecha vencida para no ocultar el dato.
      if (a.certified) out.push(a.certDate ? { icon, label: "Habilitado hasta", value: formatDate(a.certDate) } : { icon, label: "Habilitado", value: "Sí" });
      else if (a.certDate) out.push({ icon, label: "Habilitación vencida el", value: formatDate(a.certDate) });
      continue;
    }
    const field = fieldByKey.get(key)!;
    if (field.value!(a) !== "Sí") continue;
    out.push(FEATURE_WITH_YES.has(key) ? { icon, label: field.label, value: "Sí" } : { icon, label: field.label });
  }
  return out;
}

// Recuadro "Motor" junto a las fotos (VA-41 / composición): solo con un motor y nunca en
// Bimotor (la categoría manda, aunque el aviso tenga cargado un solo motor).
export function showsEngineSummary(a: AircraftDetail): boolean {
  return a.engines.length === 1 && categoryDef(a.categoryId)?.group !== "Bimotor";
}

// omitSummary (vista web, VA-41): sin los datos del resumen de arriba, salvo en "General", que en la
// web lleva Marca, Modelo, Año, Horas, Categoría y Estado (VA-131, pedido del socio 17/10). Los motores
// van siempre completos: el recuadro de arriba muestra solo 4 datos (9/10). La impresión / PDF usa
// la ficha completa.
export function aircraftSections(a: AircraftDetail, { omitSummary = false }: { omitSummary?: boolean } = {}): DetailSection[] {
  const multipleEngines = a.engines.length > 1;
  const out: (DetailSection | null)[] = [];
  for (const { key, title } of AIRCRAFT_SECTIONS) {
    if (key === "motor") {
      a.engines.forEach((e, i) =>
        out.push(section(multipleEngines ? `Motor ${i + 1}` : title, ENGINE_FIELDS.map((f) => ({ label: f.label, value: f.value(e), helpHref: f.helpHref }))))
      );
      continue;
    }
    if (key === "helice") {
      a.propeller.forEach((pr, i) =>
        out.push(section(multipleEngines ? `Hélice ${i + 1}` : title, PROPELLER_FIELDS.map((f) => ({ label: f.label, value: f.value(pr) }))))
      );
      continue;
    }
    const fields = AIRCRAFT_FIELDS.filter(
      (f) =>
        f.section === key &&
        (f.inDetail === "row" || (f.inDetail === "summary" && (!omitSummary || (key === "general" && f.key !== "subModel")))) &&
        (!f.when || f.when(a))
    );
    if (!fields.length) continue;
    out.push(section(title, fields.map((f) => ({ label: f.label, value: f.value?.(a), list: f.list?.(a), helpHref: f.helpHref }))));
  }
  return out.filter((x): x is DetailSection => !!x);
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

// omitSummary (vista web, VA-41): sin "General", que ya está en el resumen. La impresión usa todo.
export function sparePartSections(s: SparePartDetail, { omitSummary = false }: { omitSummary?: boolean } = {}): DetailSection[] {
  const attributes = Object.entries((s.attributes as Record<string, unknown>) || {}).filter(
    ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
  );
  const sections: (DetailSection | null)[] = [
    omitSummary ? null : section("General", [
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
