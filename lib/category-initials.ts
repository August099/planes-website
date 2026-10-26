// Dos iniciales por categoría para las fichas de la Home (rediseño 25/10), en vez del número de orden:
// "Fuselaje y Estructura" → "FE", "Tren de Aterrizaje, Frenos, Cubiertas" → "TA". Si dos categorías
// dan las mismas, la segunda prueba con la palabra siguiente y, si no alcanza, con la segunda letra.
const STOP_WORDS = new Set(["y", "e", "de", "del", "la", "las", "el", "los", "para", "con", "a"]);

const words = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()))
    .map((w) => w.toUpperCase());

export function categoryInitials(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const w = words(name);
    if (w.length === 0) return "";
    const candidates = [
      ...w.slice(1).map((second) => w[0][0] + second[0]),
      ...w[0].slice(1).split("").map((letter) => w[0][0] + letter),
    ];
    const pick = candidates.find((c) => !used.has(c)) ?? candidates[0] ?? w[0][0];
    used.add(pick);
    return pick;
  });
}
