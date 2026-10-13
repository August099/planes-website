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

export const AIRCRAFT_CATEGORIES: AircraftCategoryDef[] = [
  { id: "MP", group: "Monomotor", engine: "PISTON" },
  { id: "MT", group: "Monomotor", engine: "TURBOPROP" },
  { id: "BP", group: "Bimotor", engine: "PISTON" },
  { id: "BT", group: "Bimotor", engine: "TURBOPROP" },
  { id: "A", group: "Agrícola" },
  { id: "H", group: "Helicóptero" },
  { id: "E", group: "Experimental / LSA" },
  { id: "PR", group: "Proyecto" },
  { id: "S/C", group: "Otros" },
];

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
