"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProfileListings, type ModerationMap, type ProfileQuota, type StatusTarget } from "@/components/ui/profile/ProfileListings";
import { requestReviewAction } from "@/app/actions/moderation-actions";
import dynamic from "next/dynamic";

// VA-151: el panel (y su gráfico) se descarga solo al abrir la pestaña "Métricas".
const SellerMetricsPanel = dynamic(() => import("@/components/ui/profile/SellerMetricsPanel"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-500">Cargando métricas…</p>,
});
import {
  updateProfileAction,
  updateAvatarAction,
  removeAvatarAction,
  changePasswordAction, // Asegúrate de importar tu Server Action o API para cambiar contraseña
} from "@/app/actions/profile-actions";
import { deleteListingAction, setListingStatusAction } from "@/app/actions/listing-actions";
import { Lock } from "lucide-react";
import {
  BarChart3,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Edit,
  Plane,
  Loader2,
  CheckCircle2,
  Camera,
  Trash2,
  Receipt,
} from "lucide-react";
import { PROFILE_FIELD_LABELS, type ProfileField } from "@/lib/profile";
import { ProvinceSelect } from "@/components/ui/ProvinceSelect";
import { USER_TYPE_LABELS, USER_TYPE_OPTIONS } from "@/lib/user-types";
import { StorefrontHeader, type StorefrontData } from "@/components/ui/profile/StorefrontHeader";
import { StorefrontEditor } from "@/components/ui/profile/StorefrontEditor";
import { SubscriptionPanel } from "@/components/ui/profile/SubscriptionPanel";
import type { SubscriptionSummary } from "@/lib/subscriptions";
import type { PurchaseRow } from "@/lib/purchases";
import { PurchasesPanel } from "@/components/ui/profile/PurchasesPanel";
import { BillingProfilePanel, type BillingProfileValues } from "@/components/ui/profile/BillingProfilePanel";
import { PASSWORD_REGEX } from "@/lib/password-rules";

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// Lo que la vista usa de cada aviso del perfil (app/profile/[id]/page.tsx manda más campos).
type ProfileListing = {
  id: string;
  title: string;
  price: number | null;
  city: string;
  province: string;
  category: { id: string; name: string } | null;
  images: { url: string }[];
  // VA-97: estado y fecha de alta (filtros por estado y orden de la grilla).
  status?: string;
  createdAt?: string;
  // Solo para el dueño.
  _count?: { favorites: number; questions: number; analyticsEvents: number };
};

export type ProfileUserData = {
  id: string;
  name: string | null;
  email?: string | null;
  phone?: string | null;
  image: string | null;
  city: string | null;
  province: string | null;
  userType: string;
  facebook: string | null;
  instagram: string | null;
  createdAt: string;
  aircrafts: (ProfileListing & { year: number; totalTimeHours: number | null })[];
  spareParts: (ProfileListing & { inPesos: boolean })[];
};

interface Props {
  profileUser: ProfileUserData;
  isOwner: boolean;
  currentUserFavIds: string[];
  // VA-46: campos que le faltan al dueño (se calculan en el servidor, ver lib/profile.ts).
  missingProfileFields?: ProfileField[];
  // VA-87: datos de la página personalizada; null si el vendedor no tiene el beneficio del plan.
  storefront?: StorefrontData | null;
  // VA-80: plan del dueño del perfil (solo se pasa cuando lo mira el dueño).
  subscription?: SubscriptionSummary | null;
  // VA-92: "Mis compras" y datos de facturación guardados (solo el dueño).
  purchases?: PurchaseRow[];
  initialTab?: "purchases";
  billingProfile?: { values: BillingProfileValues; saved: boolean } | null;
  // VA-105 · 3: "Cambiar contraseña" solo para cuentas con contraseña (las de Google la crean con
  // "Olvidé mi contraseña").
  hasPassword?: boolean;
  // VA-151: el plan vigente incluye el panel de métricas (solo se pasa al dueño).
  hasSellerMetrics?: boolean;
  // VA-152: uso del cupo (solo el dueño).
  quota?: ProfileQuota | null;
  // VA-154: avisos pausados por moderación (motivo y si pidió revisión), solo el dueño.
  moderation?: ModerationMap;
}

export function ProfileView({
  profileUser,
  isOwner,
  currentUserFavIds,
  missingProfileFields = [],
  storefront = null,
  subscription = null,
  purchases = [],
  billingProfile = null,
  hasPassword = false,
  hasSellerMetrics = false,
  quota = null,
  moderation = {},
  initialTab,
}: Props) {
  const isMissing = (f: ProfileField) => isOwner && missingProfileFields.includes(f);
  const missingDot = (field: ProfileField) =>
    isMissing(field) ? (
      <span className="ml-1 inline-block w-2 h-2 rounded-full bg-red-600 align-middle" aria-label="Falta completar" />
    ) : null;
  const [activeTab, setActiveTab] = useState<"listings" | "purchases" | "metrics" | "edit">(initialTab ?? "listings");
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados para Modal de Edición de Publicaciones

  // Estados para Cambio de Contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // VA-152: pausar, activar (con cupo libre) y marcar vendido desde "Mis publicaciones".
  const [loadingStatusId, setLoadingStatusId] = useState<string | null>(null);

  const handleStatus = async (id: string, type: "aircraft" | "sparepart", to: StatusTarget) => {
    setLoadingStatusId(id);
    try {
      const res = await setListingStatusAction(id, type, to);
      if (!res.success) alert(res.error);
    } catch {
      alert("Error de conexión. Probá de nuevo.");
    } finally {
      setLoadingStatusId(null);
    }
  };

  // VA-154: "Pedir revisión" de un aviso pausado por moderación (después de editarlo).
  const handleRequestReview = async (id: string, type: "aircraft" | "sparepart") => {
    if (!confirm("¿Ya corregiste el aviso? Vamos a revisarlo y te avisamos por mail.")) return;
    setLoadingStatusId(id);
    try {
      const res = await requestReviewAction({ kind: type === "aircraft" ? "AIRCRAFT" : "SPARE_PART", id });
      if (!res.ok) alert(res.error);
    } catch {
      alert("Error de conexión. Probá de nuevo.");
    } finally {
      setLoadingStatusId(null);
    }
  };

  const handleDelete = async (id: string, type: "aircraft" | "sparepart") => {
    if (!confirm("¿Estás seguro de que querés eliminar esta publicación?")) return;
    try {
      const res = await deleteListingAction(id, type === "aircraft" ? "AIRCRAFT" : "SPARE_PART");
      if (!res.success) {
        alert(res.error || "Error al eliminar la publicación.");
      }
    } catch {
      alert("Error al eliminar la publicación.");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingSave(true);
    setSaveSuccess(false);

    const formData = new FormData(e.currentTarget);
    try {
      await updateProfileAction(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Error al actualizar los datos.");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Todos los campos son obligatorios.");
      return;
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      setPasswordError(
        "La contraseña debe contener al menos 8 caracteres, una mayúscula, un número y un carácter especial."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las nuevas contraseñas no coinciden.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("La nueva contraseña no puede ser igual a la actual.");
      return;
    }

    setLoadingPassword(true);
    try {
      const res = await changePasswordAction({ currentPassword, newPassword });
      if (res?.error) {
        setPasswordError(res.error);
      } else {
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
    if (!confirm("¿Deseas eliminar tu foto de perfil?")) return;
    setLoadingAvatar(true);
    try {
      await removeAvatarAction();
    } catch {
      alert("Error al eliminar la imagen.");
    } finally {
      setLoadingAvatar(false);
    }
  };

  const locationText = [profileUser.city, profileUser.province].filter(Boolean).join(", ");
  const memberSince = new Date(profileUser.createdAt).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* VA-87: con el beneficio "Página personalizada", encabezado de tienda; si no, el común. */}
      {storefront ? (
        <StorefrontHeader
          storefront={storefront}
          fallbackName={profileUser.name || "Usuario de Ventas Aeronáuticas"}
          userTypeLabel={USER_TYPE_LABELS[profileUser.userType as keyof typeof USER_TYPE_LABELS] ?? profileUser.userType}
          location={locationText}
          memberSince={memberSince}
          instagram={profileUser.instagram}
          facebook={profileUser.facebook}
          isOwner={isOwner}
          onEdit={() => setActiveTab("edit")}
        />
      ) : (
        <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative group w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-2 border-[#001F58]/10 shrink-0 flex items-center justify-center">
            {profileUser.image ? (
              <Image
                src={profileUser.image}
                alt={profileUser.name || "Usuario"}
                fill
                className="object-cover"
              />
            ) : (
              <svg
                className="w-16 h-16 text-slate-400 translate-y-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}

            {loadingAvatar && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white z-10">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}

            {isOwner && !loadingAvatar && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Cambiar foto"
                  className="p-1.5 rounded-full bg-white/90 text-slate-800 hover:bg-white cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
                {profileUser.image && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    title="Eliminar foto"
                    className="p-1.5 rounded-full bg-red-600/90 text-white hover:bg-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          <div className="flex-1 text-center md:text-left space-y-2 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                {/* NOMBRE DEL USUARIO */}
                <h1 className="text-2xl font-bold text-[#001F58]">
                  {profileUser.name || "Usuario de Ventas Aeronáuticas"}
                </h1>

                {/* INSIGNIA: TIPO DE CUENTA */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                    {USER_TYPE_LABELS[profileUser.userType as keyof typeof USER_TYPE_LABELS] ?? profileUser.userType}
                  </span>
                </div>
              </div>

              {isOwner && (
                <button
                  onClick={() => setActiveTab("edit")}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer self-center md:self-auto"
                >
                  <Edit className="w-4 h-4" />
                  Editar Perfil
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-500 pt-1">
              {locationText && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {locationText}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Miembro desde {memberSince}
              </span>

              {isOwner && profileUser.phone && (
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  {profileUser.phone}
                </span>
              )}
              {isOwner && (
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  {profileUser.email}
                </span>
              )}
            </div>

            {(profileUser.facebook || profileUser.instagram) && (
              <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                {profileUser.facebook && (
                  <a
                    href={profileUser.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </a>
                )}
                {profileUser.instagram && (
                  <a
                    href={profileUser.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-pink-600 transition-colors"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VA-46: aviso de perfil incompleto (solo el dueño) */}
      {isOwner && missingProfileFields.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <span className="mt-1.5 inline-block w-2.5 h-2.5 shrink-0 rounded-full bg-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">Completá tu perfil para que te puedan contactar</p>
              <p className="text-xs text-red-700">
                Falta: {missingProfileFields.map((f) => PROFILE_FIELD_LABELS[f]).join(", ")}.
                {missingProfileFields.includes("phone") && " Sin teléfono no se puede publicar."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className="min-h-11 shrink-0 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
          >
            Completar ahora
          </button>
        </div>
      )}

      {/* VA-94: CTA para el dueño sin plan: beneficios de la Página VA (discreto, sin pop-up). VA-105: "Pro" pasó a "Página VA". */}
      {isOwner && !storefront && !subscription?.active && (
        <aside className="flex flex-col gap-3 rounded-lg border border-[#001F58]/12 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-[#001F58]">Con la Página VA</span> tu perfil pasa a ser tu página: portada, logo, nombre
            comercial y WhatsApp.
          </p>
          <Link href="/plans" className="shrink-0 text-sm font-semibold text-[#001F58] underline underline-offset-2 hover:text-[#E70F1F]">
            Ver planes
          </Link>
        </aside>
      )}

      {/* Selector de pestañas responsive */}
      {/* En celular las pestañas van en grilla de 2 columnas: con scroll horizontal "Ajustes" quedaba escondida (VA-60) */}
      <div className="grid grid-cols-2 gap-x-4 border-b border-slate-200 sm:flex sm:gap-6 sm:overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("listings")}
          className={`pt-2 pb-3 sm:pt-0 text-sm font-semibold flex items-center justify-center sm:justify-start gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "listings"
              ? "border-[#001F58] text-[#001F58]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Plane className="w-4 h-4" />
          Publicaciones ({(profileUser.aircrafts?.length || 0) + (profileUser.spareParts?.length || 0)})
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab("purchases")}
            className={`pt-2 pb-3 sm:pt-0 text-sm font-semibold flex items-center justify-center sm:justify-start gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "purchases"
                ? "border-[#001F58] text-[#001F58]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Mis compras ({purchases.length})
          </button>
        )}

        {/* VA-151: métricas de la cuenta VA (solo el dueño con el plan). */}
        {isOwner && hasSellerMetrics && (
          <button
            onClick={() => setActiveTab("metrics")}
            className={`pt-2 pb-3 sm:pt-0 text-sm font-semibold flex items-center justify-center sm:justify-start gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "metrics"
                ? "border-[#001F58] text-[#001F58]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Métricas
          </button>
        )}

        {isOwner && (
          <button
            onClick={() => setActiveTab("edit")}
            className={`pt-2 pb-3 sm:pt-0 text-sm font-semibold flex items-center justify-center sm:justify-start gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "edit"
                ? "border-[#001F58] text-[#001F58]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Edit className="w-4 h-4" />
            Ajustes
            {missingProfileFields.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-600" aria-label="Perfil incompleto" />
            )}
          </button>
        )}
      </div>

      {/* VA-97: una sola grilla de publicaciones con interruptores por tipo y filtros por estado. */}
      {activeTab === "listings" && (
        <>
          {/* VA-151: línea discreta para quien no tiene las métricas (sin bloquear nada). */}
          {isOwner && !hasSellerMetrics && (
            <p className="mb-4 text-sm text-slate-600">
              Con el plan Empresarial ves la evolución de tus avisos y de dónde llegan tus contactos.{" "}
              <Link href="/plans" className="font-semibold text-[#001F58] underline underline-offset-2 hover:text-[#E70F1F]">
                Ver planes
              </Link>
            </p>
          )}
          <ProfileListings
            aircrafts={profileUser.aircrafts ?? []}
            spareParts={profileUser.spareParts ?? []}
            isOwner={isOwner}
            favIds={currentUserFavIds}
            quota={quota}
            moderation={moderation}
            onStatus={handleStatus}
            onRequestReview={handleRequestReview}
            onDelete={handleDelete}
            loadingId={loadingStatusId}
          />
        </>
      )}

      {/* VA-92: Pestaña Mis compras */}
      {isOwner && activeTab === "purchases" && <PurchasesPanel rows={purchases} />}

      {isOwner && hasSellerMetrics && activeTab === "metrics" && <SellerMetricsPanel />}

      {/* Pestaña Ajustes */}
      {isOwner && activeTab === "edit" && (
        <div className="space-y-6 max-w-2xl mx-auto md:mx-0">
          <SubscriptionPanel subscription={subscription} />
          {billingProfile && <BillingProfilePanel initial={billingProfile.values} saved={billingProfile.saved} />}

          {/* Formulario de información de la cuenta */}
          <form onSubmit={handleUpdate} className="p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-[#001F58]">Editar Información de Cuenta</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo</label>
                <input type="text" name="name" defaultValue={profileUser.name || ""} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
              </div>
              <div>
                <label htmlFor="profile-user-type" className="block text-xs font-semibold text-slate-600 mb-1">Tipo de cuenta</label>
                <select id="profile-user-type" name="userType" defaultValue={profileUser.userType} className="w-full px-3 py-2 text-xs border rounded-xl bg-white">
                  {USER_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono de Contacto{missingDot("phone")}</label>
                <input type="text" name="phone" defaultValue={profileUser.phone || ""} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ciudad{missingDot("city")}</label>
                <input type="text" name="city" defaultValue={profileUser.city || ""} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Provincia{missingDot("province")}</label>
                <ProvinceSelect name="province" defaultValue={profileUser.province} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Facebook (URL)</label>
                <input type="url" name="facebook" defaultValue={profileUser.facebook || ""} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Instagram (URL)</label>
                <input type="url" name="instagram" defaultValue={profileUser.instagram || ""} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={loadingSave}
                className="px-5 py-2.5 bg-[#001F58] hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                {loadingSave ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
              </button>

              {saveSuccess && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Perfil actualizado correctamente.
                </span>
              )}
            </div>
          </form>

          {storefront && <StorefrontEditor storefront={storefront} />}

          {/* Formulario de Cambio de Contraseña */}
          {!hasPassword ? (
            <div className="rounded-lg border border-[#001F58]/12 bg-white p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#001F58]">
                <Lock className="h-5 w-5 text-slate-700" />
                Contraseña
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Tu cuenta entra con Google y no tiene contraseña. Si querés poder entrar también con tu email, creá una:
                te mandamos un link a tu casilla.
              </p>
              <Link href="/forgot-password" className="mt-3 inline-block text-sm font-semibold text-[#001F58] hover:text-[#E70F1F] hover:underline">
                Crear una contraseña
              </Link>
            </div>
          ) : (
          <form onSubmit={handleChangePasswordSubmit} className="p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#001F58] flex items-center gap-2">
                <Lock className="w-5 h-5 text-slate-700" />
                Seguridad & Contraseña
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Actualizá tu contraseña. Tiene que tener al menos 8 caracteres, una letra mayúscula, un número y un carácter especial.
              </p>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Contraseña actualizada exitosamente.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#001F58]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#001F58]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#001F58]"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={loadingPassword}
                className="px-5 py-2.5 bg-[#001F58] hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Cambiar Contraseña"
                )}
              </button>
            </div>
          </form>
          )}
        </div>
      )}

    </div>
  );
}