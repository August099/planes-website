// Promoción de lanzamiento (VA-47, decisión D2). Solo es un aviso visual: la cantidad y las
// condiciones de las publicaciones gratis se van a manejar con un cupón cuando se active
// Mercado Pago. Para cambiar el texto o apagar la promoción, se toca solo este archivo.
export const LAUNCH_PROMO = {
  enabled: true,
  title: "Promoción de lanzamiento",
  text: "Publicá tu avión 100% gratis",
  // Cuántas veces ve el cartel de la Home un visitante antes de que deje de aparecer.
  maxViews: 2,
} as const;

// VA-89: saldo de lanzamiento. Toda cuenta creada hasta el 2/12/2026 inclusive (hora Argentina)
// recibe 1 aviso de avión y 1 de repuesto gratis. Todavía no se le avisa a nadie: no usar en
// textos visibles hasta que exista la ventana de aviso. Para cambiar fecha o cantidades, acá
// (y, si cambia la fecha, también la migración que les dio el saldo a las cuentas existentes).
export const LAUNCH_FREE_BALANCE = {
  aircraft: 1,
  spareParts: 1,
  // 3/12/2026 00:00 en Argentina (UTC−3): las cuentas creadas antes de este instante lo reciben.
  until: new Date("2026-12-03T03:00:00Z"),
} as const;

export function qualifiesForLaunchBalance(createdAt: Date): boolean {
  return createdAt.getTime() < LAUNCH_FREE_BALANCE.until.getTime();
}
