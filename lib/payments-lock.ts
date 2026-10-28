// Candado de pagos de la rama main (26/10/2026): el sitio sale a producción para una prueba de seguridad
// externa antes del lanzamiento. Mientras REAL_PAYMENTS_LOCKED sea true, sin importar las variables de
// Vercel: no se inicia ningún cobro ni suscripción con credenciales reales de Mercado Pago (con
// credenciales de prueba, TEST-, sí) y nunca se emiten facturas (quedan pendientes). Se pasa a false al
// habilitar los pagos (docs/PASE_A_PRODUCCION.md). En pre-production no existe.
export const REAL_PAYMENTS_LOCKED = false; // 28/10: levantado por el socio para probar cobro y facturación en producción

export const PAYMENTS_LOCKED_MESSAGE = "Los pagos están desactivados temporalmente.";

/** ¿Hay que frenar este cobro? Solo con el candado puesto y credenciales que no son de prueba. */
export function realPaymentsBlocked(): boolean {
  return REAL_PAYMENTS_LOCKED && !(process.env.MP_ACCESS_TOKEN ?? "").trim().startsWith("TEST-");
}
