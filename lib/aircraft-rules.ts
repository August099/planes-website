// Campos obligatorios según la categoría (VA-44, anexo A de la composición).
// Lo usan el formulario (labels y validación) y el servidor (esquema de listing-schema.ts).

export type RuleField = "totalTimeHours" | "avDescription" | "TBO" | "engines";

// Categorías donde el campo es OPCIONAL. En el resto es obligatorio.
const OPTIONAL_IN: Record<RuleField, string[]> = {
  totalTimeHours: ["A", "E", "PR"], // Agrícola, Experimental/LSA, Proyecto
  avDescription: ["A", "PR"], // Agrícola, Proyecto
  TBO: ["PR"], // Proyecto (decisión D16)
  engines: ["PR"], // VA-90 / VA-112: opcional en Proyecto (D19)
};

export function isRequired(field: RuleField, categoryId: string | null | undefined): boolean {
  return !OPTIONAL_IN[field].includes(categoryId ?? "");
}

/** Sufijo para el label: " *" si es obligatorio, " (opcional)" si no. */
export function requiredMark(field: RuleField, categoryId: string | null | undefined): string {
  return isRequired(field, categoryId) ? " *" : " (opcional)";
}

/** VA-112 (D19): cuántos motores hacen falta como mínimo. Proyecto 0, Bimotor 2, el resto 1. */
export function minEngines(categoryId: string | null | undefined): number {
  if (!isRequired("engines", categoryId)) return 0;
  return categoryId === "BP" || categoryId === "BT" ? 2 : 1;
}
