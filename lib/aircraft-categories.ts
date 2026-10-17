// Mapa único de categorías de aeronaves (VA-43). Lo usan el formulario de publicación,
// los filtros de /planes y el servidor (para derivar engineType de la categoría).
// Los ids son los de la tabla AircraftCategory.

export type EngineKind = "PISTON" | "TURBOPROP";

export interface AircraftCategoryDef {
  id: string;
  group: string;
  engine?: EngineKind;
}

export const ENGINE_LABELS: Record<EngineKind, string> = {
  PISTON: "Pistón",
  TURBOPROP: "Turbohélice",
};

// VA-149 (socio, 17/10): el mismo orden en todo el sitio (Home, filtro de /planes y formulario):
// Monomotor → Bimotor → Experimental / LSA → Agrícola → Helicóptero → Proyecto → Otros, y dentro de
// Monomotor y Bimotor, Pistón antes que Turbohélice.
export const AIRCRAFT_CATEGORIES: AircraftCategoryDef[] = [
  { id: "MP", group: "Monomotor", engine: "PISTON" },
  { id: "MT", group: "Monomotor", engine: "TURBOPROP" },
  { id: "BP", group: "Bimotor", engine: "PISTON" },
  { id: "BT", group: "Bimotor", engine: "TURBOPROP" },
  { id: "E", group: "Experimental / LSA" },
  { id: "A", group: "Agrícola" },
  { id: "H", group: "Helicóptero" },
  { id: "PR", group: "Proyecto" },
  { id: "S/C", group: "Otros" },
];

/** VA-149: ordena categorías que vienen de la base (ordenadas por nombre) según AIRCRAFT_CATEGORIES. */
export function sortAircraftCategories<T extends { id: string }>(list: T[]): T[] {
  const rank = (id: string) => {
    const i = AIRCRAFT_CATEGORIES.findIndex((c) => c.id === id);
    return i === -1 ? AIRCRAFT_CATEGORIES.length : i;
  };
  return [...list].sort((a, b) => rank(a.id) - rank(b.id));
}

// Grupos en el orden en que se muestran ("Tipo de aeronave").
export const AIRCRAFT_GROUPS = [...new Set(AIRCRAFT_CATEGORIES.map((c) => c.group))];

export function categoryDef(id: string | null | undefined): AircraftCategoryDef | undefined {
  return AIRCRAFT_CATEGORIES.find((c) => c.id === id);
}

export function categoriesInGroup(group: string): AircraftCategoryDef[] {
  return AIRCRAFT_CATEGORIES.filter((c) => c.group === group);
}

/** Un grupo con motorización (Monomotor/Bimotor) tiene más de una categoría. */
export function groupHasEngines(group: string): boolean {
  return categoriesInGroup(group).length > 1;
}

/** Id de categoría para un grupo y, si corresponde, una motorización. */
export function resolveCategoryId(group: string, engine?: EngineKind | null): string {
  const options = categoriesInGroup(group);
  if (options.length === 1) return options[0].id;
  return options.find((c) => c.engine === engine)?.id ?? "";
}

/** engineType que corresponde a la categoría (VA-21): solo Monomotor/Bimotor lo tienen. */
export function engineTypeForCategory(id: string | null | undefined): EngineKind | null {
  return categoryDef(id)?.engine ?? null;
}
