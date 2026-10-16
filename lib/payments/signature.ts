import "server-only";
import crypto from "node:crypto";

// VA-92: validación de la firma de los webhooks de Mercado Pago (documentación oficial, "Validar
// origen de una notificación"): el header x-signature trae "ts=<timestamp>,v1=<hmac>" y el HMAC
// SHA-256, con la clave secreta de la aplicación, se calcula sobre el "manifest"
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// donde data.id sale del query string (en minúsculas si es alfanumérico). Si falta data.id o el
// request-id, esas partes se omiten del manifest.

export type SignatureCheck = { valid: true } | { valid: false; reason: string };

export function parseSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  let ts = "";
  let v1 = "";
  for (const part of header.split(",")) {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=").trim();
    if (key.trim() === "ts") ts = value;
    if (key.trim() === "v1") v1 = value;
  }
  return ts && v1 ? { ts, v1 } : null;
}

export function signatureManifest(dataId: string | null, requestId: string | null, ts: string): string {
  let manifest = "";
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}

export function verifyMercadoPagoSignature(input: {
  secret: string | null;
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}): SignatureCheck {
  if (!input.secret) return { valid: false, reason: "MP_WEBHOOK_SECRET no está cargada (se rechaza todo)" };
  const parsed = parseSignatureHeader(input.signature);
  if (!parsed) return { valid: false, reason: "Falta o es inválido el header x-signature" };

  const expected = crypto
    .createHmac("sha256", input.secret)
    .update(signatureManifest(input.dataId, input.requestId, parsed.ts))
    .digest("hex");
  const a = Buffer.from(parsed.v1, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false, reason: "La firma no coincide" };
  return { valid: true };
}
