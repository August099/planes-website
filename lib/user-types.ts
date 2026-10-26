import type { UserType } from "@prisma/client";

// Tipo de cuenta (VA-87). Las opciones que puede elegir el usuario son las mismas de /register;
// "Fábrica" (FACTORY) solo la asigna un admin desde /admin/users (VA-33). Solo import de tipos: se usa
// también en componentes cliente.
export const USER_TYPE_OPTIONS: { value: UserType; label: string }[] = [
  { value: "PARTICULAR", label: "Particular / Privado" },
  { value: "RESELLER", label: "Empresa / Taller / Broker" },
];

export const USER_TYPE_LABELS: Record<UserType, string> = {
  PARTICULAR: "Particular / Privado",
  RESELLER: "Empresa / Taller / Broker",
  FACTORY: "Fábrica",
};

/** Todos los tipos, para el admin (incluye Fábrica). */
export const ADMIN_USER_TYPE_OPTIONS: { value: UserType; label: string }[] = (
  Object.keys(USER_TYPE_LABELS) as UserType[]
).map((value) => ({ value, label: USER_TYPE_LABELS[value] }));

/** Valida en el servidor un tipo de cuenta enviado por un formulario. */
export function parseSelectableUserType(value: unknown): UserType | null {
  return USER_TYPE_OPTIONS.find((o) => o.value === value)?.value ?? null;
}

/** Igual que parseSelectableUserType, pero acepta los tres tipos (solo para el admin). */
export function parseAnyUserType(value: unknown): UserType | null {
  return ADMIN_USER_TYPE_OPTIONS.find((o) => o.value === value)?.value ?? null;
}
