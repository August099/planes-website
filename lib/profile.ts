// Completitud del perfil (VA-46). Faltantes: teléfono, ciudad, provincia y email verificado.
// La foto es opcional (decisión del 9/10). Las cuentas de Google no tienen emailVerified en la
// base, pero el email ya lo verificó Google: solo cuenta en cuentas con contraseña.

export type ProfileField = "phone" | "emailVerified" | "city" | "province";

export const PROFILE_FIELD_LABELS: Record<ProfileField, string> = {
  phone: "Teléfono",
  emailVerified: "Email verificado",
  city: "Ciudad",
  province: "Provincia",
};

type ProfileData = {
  phone: string | null;
  city: string | null;
  province: string | null;
  emailVerified: Date | string | null;
  passwordHash?: string | null;
  hasPassword?: boolean;
};

const empty = (v: string | null | undefined) => !v || v.trim() === "";

export function getMissingProfileFields(u: ProfileData): ProfileField[] {
  const missing: ProfileField[] = [];
  if (empty(u.phone)) missing.push("phone");
  const hasPassword = u.hasPassword ?? !!u.passwordHash;
  if (hasPassword && !u.emailVerified) missing.push("emailVerified");
  if (empty(u.city)) missing.push("city");
  if (empty(u.province)) missing.push("province");
  return missing;
}
