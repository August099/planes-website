"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import {
  updateProfileAction,
  updateAvatarAction,
  removeAvatarAction,
} from "@/app/actions/profile-actions";
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
} from "lucide-react";

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
}

export function ProfileView({ profileUser, isOwner, currentUserFavIds }: Props) {
  const [activeTab, setActiveTab] = useState<"aircrafts" | "spareparts" | "edit">("aircrafts");
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
            /* Avatar corte Instgram*/
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

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-[#001F58]">
                {profileUser.name || "Usuario de Ventas Aeronáuticas"}
              </h1>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold uppercase tracking-wider mt-1">
                {profileUser.userType}
              </span>
            </div>

            {isOwner && (
              <button
                onClick={() => setActiveTab("edit")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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

      {/* Selector de tablas */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("aircrafts")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "aircrafts"
              ? "border-[#001F58] text-[#001F58]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Plane className="w-4 h-4" />
          Aeronaves ({profileUser.aircrafts.length})
        </button>

        <button
          onClick={() => setActiveTab("spareparts")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "spareparts"
              ? "border-[#001F58] text-[#001F58]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Wrench className="w-4 h-4" />
          Repuestos ({profileUser.spareParts.length})
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab("edit")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
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

      {activeTab === "aircrafts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {profileUser.aircrafts.map((item: any) => (
            <div key={item.id} className="space-y-2">
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
                <div className="p-2.5 bg-white/80 rounded-xl border border-slate-200/80 text-[11px] flex items-center justify-around text-slate-600">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-slate-400" />{item._count?.analyticsEvents || 0}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-500" />{item._count?.favorites || 0}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-blue-500" />{item._count?.leads || 0}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "spareparts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {profileUser.spareParts.map((item: any) => (
            <div key={item.id} className="space-y-2">
              <SparePartCard
                id={item.id}
                title={item.title}
                price={item.price ? Number(item.price) : null}
                category={item.category}
                city={item.city}
                province={item.province}
                imageUrl={item.images[0]?.url ?? "/placeholder.png"}
                isFavoriteInitial={currentUserFavIds.includes(item.id)}
              />
              {isOwner && (
                <div className="p-2.5 bg-white/80 rounded-xl border border-slate-200/80 text-[11px] flex items-center justify-around text-slate-600">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-slate-400" />{item._count?.analyticsEvents || 0}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-500" />{item._count?.favorites || 0}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-blue-500" />{item._count?.leads || 0}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && activeTab === "edit" && (
        <form onSubmit={handleUpdate} className="p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 space-y-4 max-w-2xl">
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
      )}
    </div>
  );
}