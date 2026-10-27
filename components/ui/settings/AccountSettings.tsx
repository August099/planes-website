"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, CheckCircle2, Loader2, Lock, Trash2 } from "lucide-react";
import { updateProfileAction, updateAvatarAction, removeAvatarAction, changePasswordAction } from "@/app/actions/profile-actions";
import { refreshHeaderIndicators } from "@/lib/header-refresh";
import { normalizeSocialUrl } from "@/lib/social-links";
import { PROFILE_FIELD_LABELS, type ProfileField } from "@/lib/profile";
import { ProvinceSelect } from "@/components/ui/ProvinceSelect";
import { LocalityInput } from "@/components/ui/LocalityInput";
import { USER_TYPE_OPTIONS } from "@/lib/user-types";
import { StorefrontEditor } from "@/components/ui/profile/StorefrontEditor";
import type { StorefrontData } from "@/components/ui/profile/StorefrontHeader";
import { SubscriptionPanel } from "@/components/ui/profile/SubscriptionPanel";
import type { SubscriptionSummary } from "@/lib/subscriptions";
import type { PurchaseRow } from "@/lib/purchases";
import { PurchasesPanel } from "@/components/ui/profile/PurchasesPanel";
import { BillingProfilePanel, type BillingProfileValues } from "@/components/ui/profile/BillingProfilePanel";
import type { ProfileQuota } from "@/components/ui/profile/ProfileListings";
import { CookieSettingsLink } from "@/components/ui/CookieSettingsLink";
import { PASSWORD_REGEX } from "@/lib/password-rules";
import { PhoneInput } from "@/components/ui/PhoneInput";

// VA-175: "Ajustes" (/settings). Toda la configuración de la cuenta en un solo lugar, una columna y un
// "Guardar" por sección. Son los mismos formularios que estaban en el perfil (pestaña Ajustes, "Mis
// compras" y la foto), movidos sin rehacerlos; "Mi cuenta" (el perfil) queda para ver.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const INPUT = "w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white";

export type SettingsUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  city: string | null;
  province: string | null;
  userType: string;
  facebook: string | null;
  instagram: string | null;
};

type Props = {
  user: SettingsUser;
  missingProfileFields: ProfileField[];
  storefront: StorefrontData | null;
  subscription: SubscriptionSummary | null;
  quota: ProfileQuota | null;
  purchases: PurchaseRow[];
  billingProfile: { values: BillingProfileValues; saved: boolean } | null;
  hasPassword: boolean;
};

function Section({ id, title, children, hideTitle = false }: { id: string; title: string; children: React.ReactNode; hideTitle?: boolean }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={hideTitle ? "sr-only" : LABEL}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function AccountSettings({ user, missingProfileFields, storefront, subscription, quota, purchases, billingProfile, hasPassword }: Props) {
  const missingDot = (field: ProfileField) =>
    missingProfileFields.includes(field) ? <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-600 align-middle" aria-label="Falta completar" /> : null;

  // Datos personales
  // 26/10: ciudad con las localidades de la provincia (lib/localities, como en Publicar).
  const [province, setProvince] = useState(user.province ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [loadingSave, setLoadingSave] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingSave(true);
    setSaveSuccess(false);
    const formData = new FormData(e.currentTarget);
    // 26/10: links de redes de esa red (la misma validación corre en el servidor).
    for (const network of ["facebook", "instagram"] as const) {
      const res = normalizeSocialUrl(network, String(formData.get(network) ?? ""));
      if (!res.ok) {
        alert(res.error);
        setLoadingSave(false);
        return;
      }
    }
    try {
      await updateProfileAction(formData);
      setSaveSuccess(true);
      refreshHeaderIndicators(); // VA-185: apaga el punto de "Ajustes" si ya no falta nada
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Error al actualizar los datos.");
    } finally {
      setLoadingSave(false);
    }
  };

  // Foto
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await updateAvatarAction(formData);
    } catch {
      alert("Error al subir la imagen.");
    } finally {
      setLoadingAvatar(false);
    }
  };
  const handleRemoveAvatar = async () => {
    if (!confirm("¿Querés eliminar tu foto de perfil?")) return;
    setLoadingAvatar(true);
    try {
      await removeAvatarAction();
    } catch {
      alert("Error al eliminar la imagen.");
    } finally {
      setLoadingAvatar(false);
    }
  };

  // Contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const handleChangePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (!currentPassword || !newPassword || !confirmPassword) return setPasswordError("Todos los campos son obligatorios.");
    if (!PASSWORD_REGEX.test(newPassword)) return setPasswordError("La contraseña debe contener al menos 8 caracteres, una mayúscula, un número y un carácter especial.");
    if (newPassword !== confirmPassword) return setPasswordError("Las nuevas contraseñas no coinciden.");
    if (currentPassword === newPassword) return setPasswordError("La nueva contraseña no puede ser igual a la actual.");
    setLoadingPassword(true);
    try {
      const res = await changePasswordAction({ currentPassword, newPassword });
      if (res?.error) setPasswordError(res.error);
      else {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 4000);
      }
    } catch {
      setPasswordError("Ocurrió un error inesperado. Probá de nuevo más tarde.");
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="space-y-10">
      {missingProfileFields.length > 0 && (
        <p className="border-l-2 border-[#D62828] pl-3 text-sm text-slate-700">
          Completá tu perfil para que te puedan contactar. Falta: {missingProfileFields.map((f) => PROFILE_FIELD_LABELS[f]).join(", ")}.
          {missingProfileFields.includes("phone") && " Sin teléfono no se puede publicar."}
        </p>
      )}

      <Section id="datos" title="Datos personales">
        <div className="flex items-center gap-4 rounded-lg border border-[#00205B]/12 bg-white p-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
            {user.image ? <Image src={user.image} alt={user.name || "Tu foto"} fill sizes="64px" className="object-cover" /> : <span className="text-xl font-bold text-slate-500">{(user.name || "?").charAt(0).toUpperCase()}</span>}
            {loadingAvatar && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={loadingAvatar} onClick={() => fileInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#00205B]/20 px-3 text-sm font-semibold text-[#00205B] hover:bg-slate-50 cursor-pointer">
              <Camera className="h-4 w-4" /> Cambiar foto
            </button>
            {user.image && (
              <button type="button" disabled={loadingAvatar} onClick={handleRemoveAvatar} className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-red-700 hover:bg-red-50 cursor-pointer">
                <Trash2 className="h-4 w-4" /> Quitar
              </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 rounded-lg border border-[#00205B]/12 bg-white p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Nombre completo</label>
              <input type="text" name="name" defaultValue={user.name || ""} className={INPUT} />
            </div>
            <div>
              <label htmlFor="settings-user-type" className="mb-1 block text-xs font-semibold text-slate-600">Tipo de cuenta</label>
              <select id="settings-user-type" name="userType" defaultValue={user.userType} className={INPUT}>
                {USER_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Teléfono de contacto{missingDot("phone")}</label>
              <PhoneInput name="phone" defaultValue={user.phone} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ciudad{missingDot("city")}</label>
              <LocalityInput name="city" value={city} province={province} onChange={setCity} placeholder="Ej: Rosario" className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Provincia{missingDot("province")}</label>
              <ProvinceSelect name="province" value={province} onChange={setProvince} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Facebook</label>
              <input type="text" name="facebook" placeholder="facebook.com/tu-pagina o @tu-pagina" defaultValue={user.facebook || ""} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Instagram</label>
              <input type="text" name="instagram" placeholder="instagram.com/tu-usuario o @tu-usuario" defaultValue={user.instagram || ""} className={INPUT} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={loadingSave} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#001331] cursor-pointer">
              {loadingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </button>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Datos guardados.
              </span>
            )}
          </div>
        </form>
      </Section>

      <Section id="seguridad" title="Email y contraseña">
        <div className="rounded-lg border border-[#00205B]/12 bg-white p-4 sm:p-6">
          <p className="text-sm text-slate-600">
            Email de la cuenta: <span className="font-semibold text-[#00205B]">{user.email}</span>
          </p>
          {!hasPassword ? (
            <p className="mt-3 text-sm text-slate-600">
              <Lock className="mr-1 inline h-4 w-4 text-slate-500" />
              Tu cuenta entra con Google y no tiene contraseña. Si querés poder entrar también con tu email, creá una: te mandamos un link a tu casilla.{" "}
              <Link href="/forgot-password" className="font-semibold text-[#00205B] hover:text-[#D62828] hover:underline">Crear una contraseña</Link>
            </p>
          ) : (
            <form onSubmit={handleChangePasswordSubmit} className="mt-4 space-y-3">
              <p className="text-xs text-slate-500">Al menos 8 caracteres, una letra mayúscula, un número y un carácter especial.</p>
              {passwordError && <p className="text-sm text-red-700">{passwordError}</p>}
              {passwordSuccess && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Contraseña actualizada.
                </p>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Contraseña actual</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={INPUT} required />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Nueva contraseña</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={INPUT} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Repetir la nueva</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={INPUT} required />
                </div>
              </div>
              <button type="submit" disabled={loadingPassword} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#001331] disabled:opacity-50 cursor-pointer">
                {loadingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cambiar contraseña"}
              </button>
            </form>
          )}
        </div>
      </Section>

      <Section id="plan" title="Plan y suscripción">
        <SubscriptionPanel subscription={subscription} quota={quota} />
      </Section>

      <Section id="compras" title="Mis compras">
        <PurchasesPanel rows={purchases} />
      </Section>

      {billingProfile && (
        <Section id="facturacion" title="Datos de facturación" hideTitle>
          <BillingProfilePanel initial={billingProfile.values} saved={billingProfile.saved} />
        </Section>
      )}

      <Section id="notificaciones" title="Notificaciones y cookies">
        <div className="space-y-2 rounded-lg border border-[#00205B]/12 bg-white p-4 text-sm text-slate-600 sm:p-6">
          <p>Te escribimos por mail cuando te hacen una consulta, cuando cambia tu suscripción o si un aviso tuyo se pausa por moderación.</p>
          <p>
            Las cookies de medición solo se usan si las aceptaste.{" "}
            <CookieSettingsLink label="Cambiar mi elección de cookies" className="font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]" />
          </p>
        </div>
      </Section>

      {storefront && (
        <Section id="pagina-va" title="Página personalizada">
          <StorefrontEditor storefront={storefront} />
        </Section>
      )}
    </div>
  );
}
