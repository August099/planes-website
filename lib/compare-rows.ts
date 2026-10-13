import "server-only";
import type { AircraftDetail } from "@/lib/listing-data";
import { AIRCRAFT_FIELDS, AIRCRAFT_SECTIONS, ENGINE_FIELDS, PROPELLER_FIELDS, type Best } from "@/lib/aircraft-fields";

// VA-83: filas del comparador a partir de la lista única de campos (lib/aircraft-fields.ts).
// Se arman en el servidor; el cliente solo las muestra y filtra ("solo diferencias").

export type CompareCell = string | string[] | null; // null = sin dato ("—")
export type CompareRow = { key: string; label: string; cells: CompareCell[]; best: boolean[]; helpHref?: string };
export type CompareSection = { title: string; rows: CompareRow[] };

function bestFlags(values: (number | undefined)[], best: Best | undefined): boolean[] {
  const present = values.filter((v): v is number => v !== undefined);
  // Solo se marca si hay al menos dos con dato y no son todos iguales.
  if (!best || present.length < 2 || new Set(present).size === 1) return values.map(() => false);
  const target = best === "min" ? Math.min(...present) : Math.max(...present);
  return values.map((v) => v === target);
}

/** `aircraft[i]` null = columna de un aviso que ya no está disponible (todas sus celdas vacías). */
export function buildCompareSections(aircraft: (AircraftDetail | null)[]): CompareSection[] {
  const live = aircraft.filter((a): a is AircraftDetail => !!a);
  const sections: CompareSection[] = [];

  for (const { key, title } of AIRCRAFT_SECTIONS) {
    const rows: CompareRow[] = [];

    if (key === "motor" || key === "helice") {
      const fields = key === "motor" ? ENGINE_FIELDS : PROPELLER_FIELDS;
      const units = (a: AircraftDetail) => (key === "motor" ? a.engines : a.propeller) as never[];
      if (!live.some((a) => units(a).length > 0)) continue;
      for (const f of fields) {
        const cells: CompareCell[] = aircraft.map((a) => {
          if (!a) return null;
          const list = units(a);
          if (list.length === 0) return null;
          const vals = list.map((u) => (f.value as (x: never) => string | undefined)(u));
          if (vals.every((v) => v === undefined)) return null;
          // Bimotores: "Motor 1 / Motor 2" dentro de la misma celda.
          return list.length > 1 ? vals.map((v, i) => `${key === "motor" ? "Motor" : "Hélice"} ${i + 1}: ${v ?? "—"}`) : vals[0]!;
        });
        // Para marcar el mejor en bimotores se toma el motor más exigido (el valor más alto).
        const numeric = aircraft.map((a) => {
          if (!a || !f.numeric) return undefined;
          const nums = units(a).map((u) => (f.numeric as (x: never) => number | undefined)(u)).filter((n): n is number => n !== undefined);
          return nums.length ? Math.max(...nums) : undefined;
        });
        rows.push({ key: `${key}.${f.key}`, label: f.label, cells, best: bestFlags(numeric, f.best), helpHref: "helpHref" in f ? f.helpHref : undefined });
      }
    } else {
      const fields = AIRCRAFT_FIELDS.filter((f) => f.section === key);
      for (const f of fields) {
        // Filas condicionales (implementos agrícolas): solo si aplica a alguna de las comparadas.
        if (f.when && !live.some((a) => f.when!(a))) continue;
        const cells: CompareCell[] = aircraft.map((a) => {
          if (!a || (f.when && !f.when(a))) return null;
          if (f.list) {
            const l = f.list(a);
            return l.length ? l : null;
          }
          return f.value?.(a) ?? null;
        });
        const numeric = aircraft.map((a) => (a && f.numeric ? f.numeric(a) : undefined));
        rows.push({ key: f.key, label: f.label, cells, best: bestFlags(numeric, f.best), helpHref: f.helpHref });
      }
    }

    if (rows.length) sections.push({ title, rows });
  }
  return sections;
}
