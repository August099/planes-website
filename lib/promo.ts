// Promoción de lanzamiento (VA-47, VA-89, VA-111). Desde el 14/10 la promoción es un **saldo**: toda
// cuenta creada hasta el corte recibe 1 aviso de avión y 1 de repuesto gratis (lib/launch-balance.ts),
// que se descuentan solos al publicar (lib/payments/allowance.ts). Ya no hace falta un cupón.
// Acá están los textos de los avisos; para apagarlos, enabled: false. Después del corte se apagan solos.
export const LAUNCH_PROMO = {
  enabled: true,
  title: "Promoción de lanzamiento",
  text: "Publicá tu avión gratis durante el lanzamiento",
  detail: "Creá tu cuenta y tenés 1 aviso de avión y 1 de repuesto sin costo.",
  // Cuántas veces ve el cartel de la Home un visitante antes de que deje de aparecer.
  maxViews: 2,
} as const;

// VA-89: saldo de lanzamiento. Toda cuenta creada hasta el 2/12/2026 inclusive (hora Argentina)
// recibe 1 aviso de avión y 1 de repuesto gratis. La fecha no se muestra en ningún texto (decisión
// del socio). Para cambiar fecha o cantidades, acá (y, si cambia la fecha, también la migración que
// les dio el saldo a las cuentas existentes).
export const LAUNCH_FREE_BALANCE = {
  aircraft: 1,
  spareParts: 1,
  // 3/12/2026 00:00 en Argentina (UTC−3): las cuentas creadas antes de este instante lo reciben.
  until: new Date("2026-12-03T03:00:00Z"),
} as const;

export function qualifiesForLaunchBalance(createdAt: Date): boolean {
  return createdAt.getTime() < LAUNCH_FREE_BALANCE.until.getTime();
}

/** ¿Se muestran los avisos de la promoción? Se apagan solos al llegar al corte del saldo. */
export function isLaunchPromoActive(now: Date = new Date()): boolean {
  return LAUNCH_PROMO.enabled && qualifiesForLaunchBalance(now);
}
