"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import {
  updateProfileAction,
  updateAvatarAction,
  removeAvatarAction,
  changePasswordAction, // Asegúrate de importar tu Server Action o API para cambiar contraseña
} from "@/app/actions/profile-actions";
import { claimCouponToProfile } from "@/app/actions/coupon-validation";
import { deleteListingAction, updateListingAction, renewListingAction } from "@/app/actions/listing-actions";
import { RefreshCw, Lock } from "lucide-react";
import {
  MapPin,
  Calendar,
  Phone,
  Mail,
  Edit,
  Plane,
  Wrench,
  Eye,
  Heart,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Camera,
  Trash2,
  Ticket,
  Plus,
  X,
  Star,
  Clock,
} from "lucide-react";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

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

interface Props {
  profileUser: any;
  isOwner: boolean;
  currentUserFavIds: string[];
  userCoupons?: any[];
}

/** Helper para calcular los días restantes de una publicación */
function getRemainingDaysText(expiresAt: Date | string | null | undefined): { text: string; isExpired: boolean; isWarning: boolean } {
  if (!expiresAt) {
    return { text: "Publicación activa", isExpired: false, isWarning: false };
  }

  const now = new Date();
  const expDate = new Date(expiresAt);
  const diffInMs = expDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return { text: "Pausada (Vencida)", isExpired: true, isWarning: false };
  }

  if (daysLeft <= 7) {
    return { text: `Vence en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}`, isExpired: false, isWarning: true };
  }

  return { text: `Vence en ${daysLeft} días`, isExpired: false, isWarning: false };
}

export function ProfileView({
  profileUser,
  isOwner,
  currentUserFavIds,
  userCoupons = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<"aircrafts" | "spareparts" | "coupons" | "edit">("aircrafts");
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados para Modal de Edición de Publicaciones
  const [editingItem, setEditingItem] = useState<{ item: any; type: "aircraft" | "sparepart" } | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [priceConsult, setPriceConsult] = useState(false);

  // Estados para reclamo de cupones
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [claimingCoupon, setClaimingCoupon] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados para Cambio de Contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingRenewId, setLoadingRenewId] = useState<string | null>(null);

  const handleRenew = async (id: string, type: "aircraft" | "sparepart") => {
    setLoadingRenewId(id);
    try {
      const res = await renewListingAction(id, type);
      if (!res.success) {
        alert("Ocurrió un error al intentar renovar.");
      }
    } catch (error) {
      alert("Error de conexión al renovar.");
    } finally {
      setLoadingRenewId(null);
    }
  };

  const handleDelete = async (id: string, type: "aircraft" | "sparepart") => {
    if (!confirm("¿Estás seguro de que querés eliminar esta publicación?")) return;
    try {
      await deleteListingAction(id, type === "aircraft" ? "AIRCRAFT" : "SPARE_PART");
    } catch (error) {
      alert("Error al eliminar la publicación.");
    }
  };

  const handleEditOpen = (item: any, type: "aircraft" | "sparepart") => {
    setEditingItem({ item, type });
    setPriceConsult(!item.price);
  };

  const handleUpdateListingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingModal(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.append("id", editingItem!.item.id);
      formData.append("listingType", editingItem!.type);
      formData.append("priceOnRequest", priceConsult.toString());

      await updateListingAction(formData);
      setEditingItem(null);
    } catch (error) {
      alert("Error al actualizar la publicación.");
    } finally {
      setLoadingModal(false);
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
    } catch (error) {
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
    } catch (err) {
      setPasswordError("Ocurrió un error inesperado. Reintenta más tarde.");
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
    } catch (error) {
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
    } catch (error) {
      alert("Error al eliminar la imagen.");
    } finally {
      setLoadingAvatar(false);
    }
  };

  const handleClaimCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;

    setClaimingCoupon(true);
    setCouponMsg(null);

    const res = await claimCouponToProfile(couponCodeInput);
    if (res.success) {
      setCouponMsg({ type: "success", text: res.message || "¡Cupón guardado exitosamente!" });
      setCouponCodeInput("");
    } else {
      setCouponMsg({ type: "error", text: res.error || "Ocurrió un error al guardar el cupón." });
    }
    setClaimingCoupon(false);
  };

  const locationText = [profileUser.city, profileUser.province].filter(Boolean).join(", ");
  const memberSince = new Date(profileUser.createdAt).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header Card del Perfil */}
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
            accept="image/*"
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

              {/* INSIGNIAS: TIPO DE CUENTA Y MIEMBRO FUNDADOR */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                  {profileUser.userType}
                </span>

                {profileUser.isFoundingMember && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold shadow-2xs">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                    Miembro Fundador
                  </span>
                )}
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

      {/* Selector de pestañas responsive */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("aircrafts")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "aircrafts"
              ? "border-[#001F58] text-[#001F58]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Plane className="w-4 h-4" />
          Aeronaves ({profileUser.aircrafts?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("spareparts")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "spareparts"
              ? "border-[#001F58] text-[#001F58]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Wrench className="w-4 h-4" />
          Repuestos ({profileUser.spareParts?.length || 0})
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab("coupons")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "coupons"
                ? "border-[#001F58] text-[#001F58]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Ticket className="w-4 h-4" />
            Mis Cupones ({userCoupons.length})
          </button>
        )}

        {isOwner && (
          <button
            onClick={() => setActiveTab("edit")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "edit"
                ? "border-[#001F58] text-[#001F58]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Edit className="w-4 h-4" />
            Ajustes
          </button>
        )}
      </div>

      {/* Pestaña Aeronaves */}
      {activeTab === "aircrafts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {profileUser.aircrafts?.map((item: any) => {
            const remainingStatus = getRemainingDaysText(item.listingExpiresAt);

            return (
              <div key={item.id} className="flex flex-col h-full justify-between space-y-2">
                <AircraftCard
                  id={item.id}
                  title={item.title}
                  price={item.price ? Number(item.price) : null}
                  year={item.year}
                  category={item.category}
                  totalTimeHours={item.totalTimeHours}
                  city={item.city}
                  province={item.province}
                  imageUrl={item.images[0]?.url ?? "/placeholder.png"}
                  isFavoriteInitial={currentUserFavIds.includes(item.id)}
                />

                {isOwner && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 text-[11px] space-y-2 text-slate-600 shadow-2xs">
                    {/* FECHA DE VENCIMIENTO Y BOTÓN DE RENOVAR */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 gap-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                            remainingStatus.isExpired
                              ? "bg-red-100 text-red-700"
                              : remainingStatus.isWarning
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {remainingStatus.text}
                        </span>
                      </div>

                      {/* BOTÓN RENOVAR */}
                      <button
                        type="button"
                        onClick={() => handleRenew(item.id, "aircraft")}
                        disabled={loadingRenewId === item.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#001F58] hover:bg-blue-900 text-white font-semibold rounded-lg text-[10px] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        title="Extender publicación 45 días más"
                      >
                        {loadingRenewId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            Renovar
                          </>
                        )}
                      </button>
                    </div>

                    {/* METRICAS DE INTERACCIÓN Y BOTONES EDITAR/ELIMINAR */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5" title="Vistas">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          {item._count?.analyticsEvents || 0}
                        </span>
                        <span className="flex items-center gap-0.5" title="Favoritos">
                          <Heart className="w-3.5 h-3.5 text-red-500" />
                          {item._count?.favorites || 0}
                        </span>
                        <span className="flex items-center gap-0.5" title="Consultas">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          {item._count?.leads || 0}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 border-l pl-2 border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleEditOpen(item, "aircraft")}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Editar Publicación"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, "aircraft")}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Eliminar Publicación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pestaña Repuestos */}
      {activeTab === "spareparts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {profileUser.spareParts?.map((item: any) => {
            const remainingStatus = getRemainingDaysText(item.listingExpiresAt);

            return (
              <div key={item.id} className="flex flex-col h-full justify-between space-y-2">
                <SparePartCard
                  id={item.id}
                  title={item.title}
                  price={item.price ? Number(item.price) : null}
                  inPesos={item.inPesos}
                  category={item.category}
                  city={item.city}
                  province={item.province}
                  imageUrl={item.images[0]?.url ?? "/placeholder.png"}
                  isFavoriteInitial={currentUserFavIds.includes(item.id)}
                />

                {isOwner && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200/80 text-[11px] space-y-2 text-slate-600 shadow-2xs">
                    {/* FECHA DE VENCIMIENTO */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Vencimiento:
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          remainingStatus.isExpired
                            ? "bg-red-100 text-red-700"
                            : remainingStatus.isWarning
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {remainingStatus.text}
                      </span>
                    </div>

                    {/* METRICAS DE INTERACCIÓN */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5" title="Vistas"><Eye className="w-3.5 h-3.5 text-slate-400" />{item._count?.analyticsEvents || 0}</span>
                        <span className="flex items-center gap-0.5" title="Favoritos"><Heart className="w-3.5 h-3.5 text-red-500" />{item._count?.favorites || 0}</span>
                        <span className="flex items-center gap-0.5" title="Consultas"><MessageSquare className="w-3.5 h-3.5 text-blue-500" />{item._count?.leads || 0}</span>
                      </div>

                      <div className="flex items-center gap-1 border-l pl-2 border-slate-200">
                        <button
                          onClick={() => handleEditOpen(item, "sparepart")}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Editar Publicación"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, "sparepart")}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Eliminar Publicación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pestaña Cupones */}
      {isOwner && activeTab === "coupons" && (
        <div className="p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 space-y-6 max-w-2xl mx-auto md:mx-0">
          <div>
            <h2 className="text-lg font-bold text-[#001F58] flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-600" />
              Cupones Promocionales
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ingresá los códigos recibidos para guardarlos en tu cuenta y aplicarlos al publicar o renovar.
            </p>
          </div>

          <form onSubmit={handleClaimCoupon} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Agregar Nuevo Código
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                placeholder="Ej: LANZ26"
                className="flex-1 px-3 py-2 text-xs border rounded-xl bg-white font-mono uppercase font-bold focus:outline-none focus:border-[#001F58]"
              />
              <button
                type="submit"
                disabled={claimingCoupon}
                className="px-4 py-2 bg-[#001F58] hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {claimingCoupon ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Guardar
                  </>
                )}
              </button>
            </div>

            {couponMsg && (
              <p
                className={`text-xs font-semibold ${
                  couponMsg.type === "success" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {couponMsg.text}
              </p>
            )}
          </form>

          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tus Cupones Registrados
            </h3>

            {userCoupons.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No tienes cupones guardados actualmente.
              </div>
            ) : (
              <div className="space-y-2">
                {userCoupons.map((c) => (
                  <div
                    key={c.usageId}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#001F58] text-sm bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                          {c.code}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {c.type === "RENEWAL" ? "Renovación" : "Descuento"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {c.discountType === "FULL_DISCOUNT" && "100% Gratis"}
                        {c.discountType === "PERCENTAGE" && `${c.discountValue}% de descuento`}
                        {c.discountType === "FIXED_AMOUNT" && `$${c.discountValue} de descuento`}
                      </p>
                    </div>

                    <div className="text-right">
                      {c.purchaseId ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          Utilizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Disponible
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pestaña Ajustes */}
      {isOwner && activeTab === "edit" && (
        <div className="space-y-6 max-w-2xl mx-auto md:mx-0">
          {/* Formulario de información de la cuenta */}
          <form onSubmit={handleUpdate} className="p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-[#001F58]">Editar Información de Cuenta</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo</label>
                <input type="text" name="name" defaultValue={profileUser.name || ""} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono de Contacto</label>
                <input type="text" name="phone" defaultValue={profileUser.phone || ""} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ciudad</label>
                <input type="text" name="city" defaultValue={profileUser.city || ""} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Provincia</label>
                <input type="text" name="province" defaultValue={profileUser.province || ""} className="w-full px-3 py-2 text-xs border rounded-xl bg-white" />
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

          {/* Formulario de Cambio de Contraseña */}
          <form onSubmit={handleChangePasswordSubmit} className="p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#001F58] flex items-center gap-2">
                <Lock className="w-5 h-5 text-slate-700" />
                Seguridad & Contraseña
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Actualiza tu contraseña. Debe contener al menos 8 caracteres, una letra mayúscula, un número y un carácter especial.
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
        </div>
      )}

      {/* MODAL DE EDICIÓN RÁPIDA DE PUBLICACIÓN */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h3 className="font-bold text-[#001F58] text-lg">
                Editar {editingItem.type === "aircraft" ? "Aeronave" : "Repuesto"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateListingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Título</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingItem.item.title}
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>

              {editingItem.type === "aircraft" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">Año</label>
                    <input
                      type="number"
                      name="year"
                      required
                      min="1900"
                      max={new Date().getFullYear()}
                      defaultValue={editingItem.item.year}
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">Horas Totales</label>
                    <input
                      type="number"
                      name="totalTimeHours"
                      required
                      min="0"
                      defaultValue={editingItem.item.totalTimeHours}
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">P/N (SKU)</label>
                    <input
                      type="text"
                      name="partNumber"
                      defaultValue={editingItem.item.partNumber || ""}
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">Stock</label>
                    <input
                      type="number"
                      name="stock"
                      required
                      min="1"
                      defaultValue={editingItem.item.stock || 1}
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Precio</label>
                <input
                  type="number"
                  name="price"
                  disabled={priceConsult}
                  defaultValue={editingItem.item.price || ""}
                  placeholder={priceConsult ? "A Consultar" : "Ej: 120000"}
                  className="w-full px-3 py-2 text-xs border rounded-xl disabled:bg-slate-100"
                />
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-1 text-xs cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={priceConsult}
                      onChange={(e) => setPriceConsult(e.target.checked)}
                      className="rounded"
                    />
                    Precio a Consultar
                  </label>

                  {editingItem.type === "sparepart" && (
                    <label className="flex items-center gap-1 text-xs cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        name="inPesos"
                        defaultChecked={editingItem.item.inPesos}
                        className="rounded"
                      />
                      Expresado en Pesos (ARS)
                    </label>
                  )}
                </div>
              </div>

              {editingItem.type === "aircraft" && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider">Opciones de Negociación</label>
                  <div className="flex flex-wrap gap-4 text-xs font-medium">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" name="financing" defaultChecked={editingItem.item.financing} className="rounded" />
                      Financiación
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" name="trade" defaultChecked={editingItem.item.trade} className="rounded" />
                      Permuta
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" name="rent" defaultChecked={editingItem.item.rent} className="rounded" />
                      Alquiler
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Ciudad</label>
                  <input
                    type="text"
                    name="city"
                    required
                    defaultValue={editingItem.item.city}
                    className="w-full px-3 py-2 text-xs border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Provincia</label>
                  <input
                    type="text"
                    name="province"
                    required
                    defaultValue={editingItem.item.province}
                    className="w-full px-3 py-2 text-xs border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Descripción</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  defaultValue={editingItem.item.description}
                  className="w-full px-3 py-2 text-xs border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs border rounded-xl hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingModal}
                  className="px-5 py-2 bg-[#001F58] text-white text-xs font-bold rounded-xl hover:bg-blue-900 cursor-pointer flex items-center gap-2"
                >
                  {loadingModal ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}