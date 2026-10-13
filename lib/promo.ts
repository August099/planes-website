// Promoción de lanzamiento (VA-47, decisión D2). VA-92: es un cupón del 100% que se crea y se
// administra en /admin/coupons (cantidad de usos, vencimiento, alcance) con el código de abajo;
// acá solo están el aviso y el código que se muestra. Para apagar el aviso, enabled: false.
export const LAUNCH_PROMO = {
  enabled: true,
  title: "Promoción de lanzamiento",
  text: "Publicá tu avión 100% gratis",
  couponCode: "LANZAMIENTO",
  // Cuántas veces ve el cartel de la Home un visitante antes de que deje de aparecer.
  maxViews: 2,
} as const;
