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
