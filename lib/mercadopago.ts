import "server-only";
import { MercadoPagoConfig } from "mercadopago";

// VA-92: configuración de Mercado Pago. Todo sale de las variables de entorno (ver .env.example y
// docs/PAGOS.md); el código no asume si las credenciales son de prueba o de producción, ni de qué
// cuenta (la vendedora de prueba o la real).

export class PaymentsConfigError extends Error {}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new PaymentsConfigError(`Falta la variable de entorno ${name}.`);
  return value;
}

let client: MercadoPagoConfig | null = null;

/** Cliente de la API de Mercado Pago. Falla si falta MP_ACCESS_TOKEN. */
export function mpClient(): MercadoPagoConfig {
  client ??= new MercadoPagoConfig({ accessToken: required("MP_ACCESS_TOKEN"), options: { timeout: 10_000 } });
  return client;
}

/** ¿Las credenciales son de prueba? Solo informativo (para mostrarlo en el admin y en los logs). */
export function mpIsTestMode(): boolean {
  return (process.env.MP_ACCESS_TOKEN ?? "").startsWith("TEST-");
}

/**
 * Clave secreta de los webhooks, o null si no está cargada. Sin clave, el webhook rechaza todo
 * (fail closed) y lo deja registrado.
 */
export function mpWebhookSecret(): string | null {
  return process.env.MP_WEBHOOK_SECRET?.trim() || null;
}

/** URL base de la app para las back_urls (local: http://localhost:3000; Preview: la del preview). */
export function appUrl(): string {
  return required("APP_URL").replace(/\/+$/, "");
}

export const WEBHOOK_PATH = "/api/webhooks/mercadopago";

/** notification_url de las preferencias: MP_NOTIFICATION_URL si está, si no APP_URL + la ruta. */
export function notificationUrl(): string {
  const explicit = process.env.MP_NOTIFICATION_URL?.trim();
  return explicit || `${appUrl()}${WEBHOOK_PATH}`;
}

/** ¿Se emiten facturas? En false los pagos funcionan y las facturas quedan pendientes. */
export function billingEnabled(): boolean {
  return process.env.BILLING_ENABLED?.trim().toLowerCase() === "true";
}
