"use client";

import { useState } from "react";
import { ProfilePageSections, type PageCard } from "@/components/ui/profile/ProfilePageSections";
import { ProfilePageEditor } from "@/components/ui/profile/ProfilePageEditor";
import type { PageSection } from "@/lib/profile-page";
import Image from "next/image";
import Link from "next/link";
import { ProfileListings, type ModerationMap, type ProfileQuota, type StatusTarget } from "@/components/ui/profile/ProfileListings";
import type { RepublishView } from "@/lib/republish";
import { requestReviewAction } from "@/app/actions/moderation-actions";
import dynamic from "next/dynamic";

// VA-151: el panel (y su gráfico) se descarga solo al abrir la pestaña "Métricas".
const SellerMetricsPanel = dynamic(() => import("@/components/ui/profile/SellerMetricsPanel"), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-500">Cargando métricas…</p>,
});
import { deleteListingAction, setListingStatusAction } from "@/app/actions/listing-actions";
import { BarChart3, MapPin, Calendar, Phone, Mail, Edit, Plane } from "lucide-react";
import { USER_TYPE_LABELS } from "@/lib/user-types";
import { StorefrontHeader, type StorefrontData } from "@/components/ui/profile/StorefrontHeader";
import type { SubscriptionSummary } from "@/lib/subscriptions";
import { SoldDialog } from "@/components/ui/profile/SoldDialog";

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
  // VA-87: datos de la página personalizada; null si el vendedor no tiene el beneficio del plan.
  storefront?: StorefrontData | null;
  // VA-80: plan del dueño del perfil (solo se pasa cuando lo mira el dueño).
  subscription?: SubscriptionSummary | null;
  // VA-151: el plan vigente incluye el panel de métricas (solo se pasa al dueño).
  hasSellerMetrics?: boolean;
  // VA-152: uso del cupo (solo el dueño).
  quota?: ProfileQuota | null;
  // VA-167: saldo de republicaciones del dueño.
  republish?: RepublishView | null;
  // VA-154: avisos pausados por moderación (motivo y si pidió revisión), solo el dueño.
  moderation?: ModerationMap;
  // VA-169: Página VA completa (Broker y admins): secciones publicadas, borrador (solo el dueño) y avisos activos.
  vaPage?: { sections: PageSection[]; draft: PageSection[] | null; listings: PageCard[] } | null;
}

export function ProfileView({
  profileUser,
  isOwner,
  currentUserFavIds,
  storefront = null,
  subscription = null,
  hasSellerMetrics = false,
  quota = null,
  republish = null,
  moderation = {},
  vaPage = null,
}: Props) {
  // VA-169: modo edición de la Página VA (solo el dueño).
  const [editingPage, setEditingPage] = useState(false);
  // Con la Página VA completa, los visitantes ven las secciones en vez de la grilla común.
  const showTabs = !vaPage || isOwner;
  const [activeTab, setActiveTab] = useState<"listings" | "metrics">("listings");
  // VA-152: pausar, activar (con cupo libre) y marcar vendido desde "Mis publicaciones".
  const [loadingStatusId, setLoadingStatusId] = useState<string | null>(null);
  // VA-183: aviso recién marcado como vendido (abre "¿Lo vendiste gracias a VA?").
  const [sold, setSold] = useState<{ kind: "AIRCRAFT" | "SPARE_PART"; id: string; currency: "USD" | "ARS" } | null>(null);

  const handleStatus = async (id: string, type: "aircraft" | "sparepart", to: StatusTarget) => {
    setLoadingStatusId(id);
    try {
      const res = await setListingStatusAction(id, type, to);
      if (!res.success) alert(res.error);
      else if (to === "SOLD") {
        const part = type === "sparepart" ? profileUser.spareParts?.find((p) => p.id === id) : null;
        setSold({ kind: type === "aircraft" ? "AIRCRAFT" : "SPARE_PART", id, currency: part?.inPesos ? "ARS" : "USD" });
      }
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
        />
      ) : (
        <div className="va-plate overflow-hidden">
          <div className="h-1.5 bg-[#00205B]" aria-hidden />
          <div className="flex flex-col items-center gap-6 p-6 md:flex-row md:items-start">
          <div className="relative w-24 h-24 rounded-md overflow-hidden bg-[#00205B] shrink-0 flex items-center justify-center">
            {profileUser.image ? (
              <Image
                src={profileUser.image}
                alt={profileUser.name || "Usuario"}
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-4xl font-extrabold text-white">
                {(profileUser.name || "V").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 text-center md:text-left w-full">
            {/* Tipo de cuenta */}
            <p className="va-label">
              {USER_TYPE_LABELS[profileUser.userType as keyof typeof USER_TYPE_LABELS] ?? profileUser.userType}
            </p>
            <h1 className="mt-1 text-[1.9rem] leading-[1.08] font-extrabold tracking-[-0.02em] text-[#00205B]">
              {profileUser.name || "Usuario de Ventas Aeronáuticas"}
            </h1>

            <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 text-[13px] text-slate-600">
              {locationText && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D62828]" />
                  {locationText}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00205B]/60" />
                Miembro desde {memberSince}
              </span>

              {isOwner && profileUser.phone && (
                <span className="flex items-center gap-1.5 font-medium text-[#00205B] tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-[#00205B]/60" />
                  {profileUser.phone}
                </span>
              )}
              {isOwner && (
                <span className="flex items-center gap-1.5 font-medium text-[#00205B]">
                  <Mail className="w-3.5 h-3.5 text-[#00205B]/60" />
                  {profileUser.email}
                </span>
              )}
            </div>

            {(profileUser.facebook || profileUser.instagram) && (
              <div className="flex items-center justify-center md:justify-start gap-2 pt-3">
                {profileUser.facebook && (
                  <a
                    href={profileUser.facebook}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#00205B]/15 text-[#00205B] transition-colors hover:border-[#D62828] hover:text-[#D62828]"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </a>
                )}
                {profileUser.instagram && (
                  <a
                    href={profileUser.instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#00205B]/15 text-[#00205B] transition-colors hover:border-[#D62828] hover:text-[#D62828]"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      )}


      {/* VA-94: CTA para el dueño sin plan: beneficios de la Página VA (discreto, sin pop-up). VA-105: "Pro" pasó a "Página VA". */}
      {isOwner && !storefront && !subscription?.active && (
        <aside className="va-plate flex flex-col gap-3 border-l-2 border-l-[#D62828] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-[#00205B]">Con la página personalizada</span> tu perfil pasa a ser tu página: portada, logo, nombre
            comercial y WhatsApp.
          </p>
          <Link href="/plans" className="shrink-0 text-sm font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]">
            Ver planes
          </Link>
        </aside>
      )}

      {/* VA-169: Página VA completa: secciones armables; el dueño la edita con "Editar". */}
      {vaPage && (
        <div className="space-y-4">
          {isOwner && !editingPage && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {vaPage.draft && <span className="text-xs text-slate-500">Tenés cambios sin publicar</span>}
              <button
                type="button"
                onClick={() => setEditingPage(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#00205B] px-4 text-sm font-bold text-white hover:bg-[#D62828] cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>
            </div>
          )}
          {isOwner && editingPage ? (
            <ProfilePageEditor initial={vaPage.draft ?? vaPage.sections} listings={vaPage.listings} profileUserId={profileUser.id} onClose={() => setEditingPage(false)} />
          ) : (
            <ProfilePageSections sections={vaPage.sections} listings={vaPage.listings} favIds={currentUserFavIds} profileUserId={profileUser.id} trackClicks={!isOwner} />
          )}
        </div>
      )}

      {showTabs && (
      <>
      {/* Selector de pestañas responsive */}
      {/* En celular las pestañas van en grilla de 2 columnas: con scroll horizontal "Ajustes" quedaba escondida (VA-60) */}
      <div className="grid grid-cols-2 gap-x-4 border-b border-[#00205B]/12 sm:flex sm:gap-6 sm:overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("listings")}
          className={`pt-2 pb-3 sm:pt-0 text-sm font-bold tabular-nums flex items-center justify-center sm:justify-start gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "listings"
              ? "border-[#D62828] text-[#00205B]"
              : "border-transparent text-[#00205B]/50 hover:text-[#00205B]"
          }`}
        >
          <Plane className="w-4 h-4" />
          Publicaciones ({(profileUser.aircrafts?.length || 0) + (profileUser.spareParts?.length || 0)})
        </button>

        {/* VA-151: métricas de la cuenta VA (solo el dueño con el plan). */}
        {isOwner && hasSellerMetrics && (
          <button
            onClick={() => setActiveTab("metrics")}
            className={`pt-2 pb-3 sm:pt-0 text-sm font-bold tabular-nums flex items-center justify-center sm:justify-start gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "metrics"
                ? "border-[#D62828] text-[#00205B]"
                : "border-transparent text-[#00205B]/50 hover:text-[#00205B]"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Métricas
          </button>
        )}
      </div>

      </>
      )}

      {/* VA-97: una sola grilla de publicaciones con interruptores por tipo y filtros por estado. */}
      {showTabs && activeTab === "listings" && (
        <>
          {/* VA-151: línea discreta para quien no tiene las métricas (sin bloquear nada). */}
          {isOwner && !hasSellerMetrics && (
            <p className="mb-4 text-sm text-slate-600">
              Con los planes Pro y Broker / Empresa ves la evolución de tus avisos y de dónde llegan tus contactos.{" "}
              <Link href="/plans" className="font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]">
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
            republish={republish}
            profileUserId={profileUser.id}
            moderation={moderation}
            onStatus={handleStatus}
            onRequestReview={handleRequestReview}
            onDelete={handleDelete}
            loadingId={loadingStatusId}
          />
        </>
      )}


      {isOwner && hasSellerMetrics && activeTab === "metrics" && <SellerMetricsPanel />}
      {sold && <SoldDialog {...sold} onClose={() => setSold(null)} />}


    </div>
  );
}