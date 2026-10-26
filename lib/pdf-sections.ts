import "server-only";
import type { AircraftDetail, SparePartDetail } from "@/lib/listing-data";
import { AIRCRAFT_FIELDS, AIRCRAFT_SECTIONS, ENGINE_FIELDS, PROPELLER_FIELDS } from "@/lib/aircraft-fields";
import { sparePartFeatures, sparePartSections } from "@/lib/listing-detail";

// VA-87 A: contenido de los PDF. Aeronave: la misma lista de campos, secciones y orden que el
// detalle y el comparador (lib/aircraft-fields.ts). Repuesto: las mismas funciones que su detalle.
// Los campos vacíos no se muestran, y en los de sí/no solo se listan los "Sí".

export type PdfRow = { label: string; value?: string; list?: string[] };
export type PdfSection = { title: string; rows: PdfRow[] };

const keep = (r: PdfRow) => (r.value !== undefined && r.value !== "No") || (r.list !== undefined && r.list.length > 0);

export function aircraftPdfSections(a: AircraftDetail): PdfSection[] {
  const multi = a.engines.length > 1;
  const out: PdfSection[] = [];
  for (const { key, title } of AIRCRAFT_SECTIONS) {
    if (key === "motor") {
      a.engines.forEach((e, i) => {
        const rows = ENGINE_FIELDS.map((f) => ({ label: f.label, value: f.value(e) })).filter(keep);
        if (rows.length) out.push({ title: multi ? `Motor ${i + 1}` : title, rows });
      });
      continue;
    }
    if (key === "helice") {
      a.propeller.forEach((p, i) => {
        const rows = PROPELLER_FIELDS.map((f) => ({ label: f.label, value: f.value(p) })).filter(keep);
        if (rows.length) out.push({ title: multi ? `Hélice ${i + 1}` : title, rows });
      });
      continue;
    }
    const rows = AIRCRAFT_FIELDS.filter(
      // La descripción general va en su propio bloque y el precio, arriba.
      (f) => f.section === key && f.key !== "description" && f.key !== "price" && (!f.when || f.when(a))
    )
      .map((f) => ({ label: f.label, value: f.value?.(a), list: f.list?.(a) }))
      .filter(keep);
    if (rows.length) out.push({ title, rows });
  }
  return out;
}

export function sparePartPdfSections(s: SparePartDetail): PdfSection[] {
  // De las características solo suma la moneda: estado, stock y Nº de parte ya están en "General".
  const features: PdfRow[] = sparePartFeatures(s)
    .filter((f) => f.icon === "price")
    .map((f) => ({ label: f.label, value: f.value ?? "Sí" }));
  return [
    ...(features.length ? [{ title: "Características", rows: features }] : []),
    ...sparePartSections(s).map((sec) => ({ title: sec.title, rows: sec.rows.map((r) => ({ label: r.label, value: r.value, list: r.list })) })),
  ];
}
