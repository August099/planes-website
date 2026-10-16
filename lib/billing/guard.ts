// VA-105 · 1.1: nunca facturas reales en pruebas. Única puerta para llamar a TusFacturas: las
// credenciales cargadas son las de PRODUCCIÓN (no hay cuenta API DEV), así que todo lo que no cumpla
// las cinco condiciones se simula (ISSUED_SIMULATED, sin CAE) y nunca sale del servidor.
// Sin dependencias de Next ni de la base: se prueba con tests/billing.test.ts.

export type BillingEnv = {
  /** BILLING_ENABLED === "true". En false no se procesa nada: la factura queda PENDING. */
  billingEnabled: boolean;
  /** VERCEL_ENV (production, preview, development o vacío en local). */
  vercelEnv: string | undefined;
  /** TUSFACTURAS_MODE: solo "production" habilita la emisión real. */
  tusfacturasMode: string | undefined;
};

export type PaymentFlags = {
  /** live_mode del pago consultado a la API de Mercado Pago (no el del payload del webhook). */
  liveMode: boolean | null;
  /** La cuenta de Mercado Pago (credenciales) es de prueba (tag test_user). */
  mpAccountIsTest: boolean;
};

export type BillingDecision =
  | { action: "skip"; reason: string } // BILLING_ENABLED=false: queda PENDING
  | { action: "simulate"; reasons: string[] } // se registra el JSON, sin llamar a TusFacturas
  | { action: "issue" }; // factura real

export function readBillingEnv(env: Record<string, string | undefined> = process.env): BillingEnv {
  return {
    billingEnabled: env.BILLING_ENABLED?.trim().toLowerCase() === "true",
    vercelEnv: env.VERCEL_ENV?.trim() || undefined,
    tusfacturasMode: env.TUSFACTURAS_MODE?.trim().toLowerCase() || undefined,
  };
}

/** Las cinco condiciones a la vez; si falta cualquiera, no hay factura real. */
export function canIssueRealInvoice(env: BillingEnv, payment: PaymentFlags): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!env.billingEnabled) reasons.push("BILLING_ENABLED no es true");
  if (env.vercelEnv !== "production") reasons.push(`VERCEL_ENV es ${env.vercelEnv ?? "(vacío)"}, no production`);
  if (env.tusfacturasMode !== "production") reasons.push(`TUSFACTURAS_MODE es ${env.tusfacturasMode ?? "(vacío)"}, no production`);
  if (payment.liveMode !== true) reasons.push("el pago no es live_mode en Mercado Pago");
  if (payment.mpAccountIsTest) reasons.push("las credenciales de Mercado Pago son de una cuenta de prueba");
  return { ok: reasons.length === 0, reasons };
}

export function billingDecision(env: BillingEnv, payment: PaymentFlags): BillingDecision {
  if (!env.billingEnabled) return { action: "skip", reason: "BILLING_ENABLED no es true" };
  const check = canIssueRealInvoice(env, payment);
  return check.ok ? { action: "issue" } : { action: "simulate", reasons: check.reasons };
}

/** Un pago es "de prueba" (no cuenta en el tope del monotributo ni en los KPIs). */
export function isTestPayment(payment: PaymentFlags): boolean {
  return payment.liveMode !== true || payment.mpAccountIsTest;
}
