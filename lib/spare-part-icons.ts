// Íconos propios de las categorías principales de repuestos (sprite public/iconos.svg, 26/10).
// Se eligen por el nombre de la categoría (sin tildes ni mayúsculas), así no dependen del slug ni del
// ícono cargado en el admin. Una categoría que no coincide sigue con su ícono de siempre.
const RULES: [RegExp, string][] = [
  [/piloto/, "piloto"],
  [/avionica/, "avionica"],
  [/fuselaje/, "fuselaje"],
  [/herramienta/, "herramientas"],
  [/agricola/, "agricola"],
  [/lubricante/, "lubricante"],
  [/ferreteria|materiales/, "ferreteria"],
  [/motor|helice/, "motor"],
  [/electric|luces/, "luces"],
  [/aterrizaje|tren de/, "aterrizaje"],
];

export const SPARE_PART_SPRITE = "/iconos.svg";

export function sparePartSpriteId(name: string): string | null {
  const key = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return RULES.find(([re]) => re.test(key))?.[1] ?? null;
}
