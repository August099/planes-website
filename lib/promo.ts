// VA-152: la promoción de lanzamiento (saldo gratis hasta el 2/12, VA-89 / VA-111) se reemplazó por
// el cupo Gratis para siempre (lib/quota.ts). Acá queda el texto de los carteles (registro, Home,
// /howtopublish, /plans y la bienvenida), armado con el cupo que se edita en /admin/plans.
export const FREE_QUOTA_PROMO = {
  title: "Publicá gratis",
  // Cuántas veces ve el cartel de la Home un visitante antes de que deje de aparecer.
  maxViews: 2,
} as const;

export type FreeQuota = { AIRCRAFT: number | null; SPARE_PART: number | null };

function count(n: number | null, one: string, many: string): string {
  return n === null ? `${many} ilimitados` : `${n} ${n === 1 ? one : many}`;
}

/** "Publicá gratis 1 avión y 5 repuestos. Sin vencimiento." */
export function freeQuotaText(q: FreeQuota): string {
  return `Publicá gratis ${count(q.AIRCRAFT, "avión", "aviones")} y ${count(q.SPARE_PART, "repuesto", "repuestos")}. Sin vencimiento.`;
}
