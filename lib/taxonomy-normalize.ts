// VA-190: "Otra marca" y "Otro modelo" se guardan en MAYÚSCULAS, sin espacios de más, y se comparan sin
// distinguir mayúsculas, tildes, espacios, guiones ni puntos ("Cessna" = "CESSNA" = "cessna"; "C-150" = "C150").

/** Cómo se guarda: mayúsculas, sin espacios al principio ni al final y con los dobles colapsados. */
export function normalizeTaxonomyName(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

/** Clave para encontrar duplicados. */
export function taxonomyKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleUpperCase("es-AR")
    .replace(/[\s\-._]+/g, "");
}
