import { z } from "zod";

// VA-92: datos de facturación del checkout. Mismas reglas en el formulario y en la action.
// Factura C (monotributo): a un consumidor final se le pide DNI solo desde el monto que fija ARCA
// (BillingSettings.dniRequiredFrom); a una empresa o responsable, CUIT y razón social.

export const IVA_CONDITIONS = [
  { value: "RI", label: "Responsable inscripto" },
  { value: "M", label: "Monotributista" },
  { value: "E", label: "Exento" },
] as const;

/** CUIT/CUIL: 11 dígitos con dígito verificador (módulo 11). */
export function isValidCuit(raw: string): boolean {
  const cuit = raw.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cuit)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(cuit[i]), 0);
  const mod = 11 - (sum % 11);
  const check = mod === 11 ? 0 : mod === 10 ? 9 : mod;
  return check === Number(cuit[10]);
}

const email = z.string().trim().toLowerCase().email("Ingresá un email válido.").max(120);
const text = (max: number, msg: string) => z.string().trim().min(2, msg).max(max);

export const billingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("CONSUMIDOR_FINAL"),
    name: text(120, "Ingresá tu nombre y apellido."),
    docNumber: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v === "" || /^\d{7,8}$/.test(v), "El DNI tiene 7 u 8 números."),
    email,
  }),
  z.object({
    kind: z.literal("EMPRESA"),
    name: text(160, "Ingresá la razón social."),
    docNumber: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine(isValidCuit, "El CUIT no es válido (11 números)."),
    ivaCondition: z.enum(["RI", "M", "E"], { message: "Elegí la condición frente al IVA." }),
    address: z.string().trim().max(200).optional().default(""),
    email,
  }),
]);

export type BillingInput = z.input<typeof billingSchema>;
export type BillingData = z.output<typeof billingSchema>;

/** Valida y, para consumidor final, exige DNI si el total llega al umbral de ARCA. */
export function parseBilling(input: unknown, total: number, dniRequiredFrom: number) {
  const parsed = billingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false as const, fieldErrors };
  }
  if (parsed.data.kind === "CONSUMIDOR_FINAL" && !parsed.data.docNumber && total >= dniRequiredFrom) {
    return { ok: false as const, fieldErrors: { docNumber: "Para este monto ARCA pide el DNI." } };
  }
  return { ok: true as const, data: parsed.data };
}

/** Copia que se guarda en la compra y con la que se factura (Invoice.receiver). */
export function billingSnapshot(data: BillingData) {
  return data.kind === "EMPRESA"
    ? { kind: data.kind, name: data.name, docType: "CUIT", docNumber: data.docNumber, ivaCondition: data.ivaCondition, address: data.address || null, email: data.email }
    : { kind: data.kind, name: data.name, docType: data.docNumber ? "DNI" : null, docNumber: data.docNumber || null, ivaCondition: "CF", address: null, email: data.email };
}
