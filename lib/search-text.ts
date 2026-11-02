// 3/11: texto de búsqueda sin acentos ni mayúsculas: "cordoba" encuentra "Córdoba" y al revés.

export const foldText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** Palabras de la búsqueda, listas para un LIKE (con % y _ escapados). Con tope, porque la escribe cualquiera. */
export function searchTokens(query: string): string[] {
  return foldText(query.slice(0, 100))
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((token) => token.replace(/[\\%_]/g, "\\$&"));
}
