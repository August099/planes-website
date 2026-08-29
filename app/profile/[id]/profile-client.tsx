"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface UserProfileData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
  instagram: string | null;
  facebook: string | null;
  city: string | null;
  province: string | null;
  createdAt: Date;
  aircraftListingsBalance: number;
  sparePartsListingsBalance: number;
}

interface AircraftListing {
  id: string;
  title: string;
  price: number | null;
  status: string;
  listingExpiresAt: Date | null;
  images: { url: string }[];
}

interface ProfileClientViewProps {
  userProfile: UserProfileData;
  userListings: AircraftListing[];
  isOwner: boolean;
  updateProfile: (formData: FormData) => Promise<void>;
  extendListing: (formData: FormData) => Promise<void>;
  deleteProfileImage: (formData: FormData) => Promise<void>;
  uploadProfileImage: (formData: FormData) => Promise<void>;
}

export default function ProfileDashboardClient({
  userProfile,
  userListings,
  isOwner,
  updateProfile,
  extendListing,
  deleteProfileImage,
  uploadProfileImage,
}: ProfileClientViewProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isViewImageOpen, setIsViewImageOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aircraftBalance = isOwner ? userProfile.aircraftListingsBalance ?? 0 : 0;
  const partsBalance = isOwner ? userProfile.sparePartsListingsBalance ?? 0 : 0;

  const locationText = [userProfile.city, userProfile.province]
    .filter(Boolean)
    .join(", ");

  const formatUrl = (url: string) => {
    if (!url) return "#";
    return url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      e.target.form?.requestSubmit();
    }
  };

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      <Image
        src="/bkg-profile.jpg"
        alt="Fondo Perfil"
        fill
        priority
        className="-z-20 object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-background/85 backdrop-blur-[2px]" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-[#001F58]/15">
          <div className="flex items-center gap-4 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => isOwner && setIsMenuOpen(!isMenuOpen)}
                className={`relative w-20 h-20 rounded-full bg-[#001F58] text-white flex items-center justify-center font-bold text-2xl shadow-md uppercase overflow-hidden shrink-0 group focus:outline-none ${
                  isOwner ? "cursor-pointer ring-4 ring-white/50 hover:ring-[#001F58]/30 transition-all" : ""
                }`}
                title={isOwner ? "Opciones de foto de perfil" : userProfile.name || "Usuario"}
              >
                {userProfile.image ? (
                  <Image
                    src={userProfile.image}
                    alt={userProfile.name || "Foto de perfil"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  userProfile.name ? userProfile.name.charAt(0) : "U"
                )}

                {isOwner && (
                  <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold">
                    📷 Cambiar
                  </div>
                )}
              </button>

              {isOwner && isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#001F58]/15 z-40 overflow-hidden py-1 text-xs text-[#001F58]">
                    {userProfile.image && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsViewImageOpen(true);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-100 font-medium flex items-center gap-2"
                      >
                        👁️ Ver foto
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-100 font-medium flex items-center gap-2"
                    >
                      📤 Subir foto
                    </button>

                    {userProfile.image && (
                      <form action={deleteProfileImage}>
                        <button
                          type="submit"
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 font-medium flex items-center gap-2"
                        >
                          🗑️ Eliminar foto
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}

              <form action={uploadProfileImage} className="hidden">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="avatar"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </form>
            </div>

            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#001F58]">
                {userProfile.name || "Vendedor"}
              </h1>
              <p className="text-sm text-[#001F58]/70">
                {isOwner
                  ? userProfile.email
                  : `Miembro desde ${new Date(userProfile.createdAt).getFullYear()}`}
              </p>

              {locationText && (
                <p className="text-xs font-semibold text-[#001F58]/80 mt-1 flex items-center gap-1">
                  📍 {locationText}
                </p>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 shadow-sm">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#001F58]/60">
                    Publicaciones Aviones
                  </p>
                  <p className="font-heading text-2xl font-black text-[#001F58]">
                    {aircraftBalance}{" "}
                    <span className="text-xs font-normal text-[#001F58]/70">
                      cupo{aircraftBalance !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>
                <div className="h-8 w-[1px] bg-[#001F58]/15" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#001F58]/60">
                    Publicaciones Repuestos
                  </p>
                  <p className="font-heading text-2xl font-black text-[#001F58]">
                    {partsBalance}{" "}
                    <span className="text-xs font-normal text-[#001F58]/70">
                      cupo{partsBalance !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>
              </div>

              <Link
                href="/plans"
                className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-[#E70F1F] hover:bg-[#c00d1a] text-white font-medium text-sm transition-all shadow-sm"
              >
                Cargar Cupos
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-[#001F58]/15 shadow-sm sticky top-24">
              <h2 className="font-heading font-bold text-lg text-[#001F58] mb-1">
                {isOwner ? "Mis Datos de Perfil" : "Información del Vendedor"}
              </h2>
              <p className="text-xs text-[#001F58]/70 mb-6">
                {isOwner
                  ? "Información personal y redes asociadas a tus publicaciones."
                  : "Datos de contacto directo para realizar consultas."}
              </p>

              {isOwner ? (
                <form action={updateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#001F58] mb-1">
                      Nombre o Nombre Comercial
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={userProfile.name || ""}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#001F58]/20 bg-white text-sm text-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/30"
                      placeholder="Ej. Aerotaller San Fernando"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#001F58] mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={userProfile.phone || ""}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#001F58]/20 bg-white text-sm text-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/30"
                      placeholder="Ej. +54 11 1234-5678"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#001F58] mb-1">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        name="city"
                        defaultValue={userProfile.city || ""}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#001F58]/20 bg-white text-sm text-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/30"
                        placeholder="Ej. Morón"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#001F58] mb-1">
                        Provincia
                      </label>
                      <input
                        type="text"
                        name="state"
                        defaultValue={userProfile.province || ""}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#001F58]/20 bg-white text-sm text-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/30"
                        placeholder="Ej. Buenos Aires"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#001F58] mb-1">
                      Instagram
                    </label>
                    <input
                      type="text"
                      name="instagram"
                      defaultValue={userProfile.instagram || ""}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#001F58]/20 bg-white text-sm text-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/30"
                      placeholder="Ej. instagram.com/miusuario o @usuario"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#001F58] mb-1">
                      Facebook
                    </label>
                    <input
                      type="text"
                      name="facebook"
                      defaultValue={userProfile.facebook || ""}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#001F58]/20 bg-white text-sm text-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/30"
                      placeholder="Ej. facebook.com/mipagina"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#001F58] hover:bg-[#001F58]/90 text-white rounded-xl py-2.5 font-medium text-sm mt-2"
                  >
                    Guardar Datos
                  </Button>
                </form>
              ) : (
                <div className="space-y-4 text-sm text-[#001F58]">
                  <div>
                    <span className="block text-xs font-semibold text-[#001F58]/60 uppercase">
                      Nombre
                    </span>
                    <p className="font-medium text-base">
                      {userProfile.name || "No especificado"}
                    </p>
                  </div>

                  {locationText && (
                    <div>
                      <span className="block text-xs font-semibold text-[#001F58]/60 uppercase">
                        Ubicación
                      </span>
                      <p className="font-medium">📍 {locationText}</p>
                    </div>
                  )}

                  {userProfile.phone && (
                    <div>
                      <span className="block text-xs font-semibold text-[#001F58]/60 uppercase">
                        Teléfono
                      </span>
                      <a
                        href={`https://wa.me/${userProfile.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-1 text-emerald-700 font-semibold hover:underline"
                      >
                        📱 {userProfile.phone}
                      </a>
                    </div>
                  )}

                  <div>
                    <span className="block text-xs font-semibold text-[#001F58]/60 uppercase">
                      Email
                    </span>
                    <p className="font-medium">{userProfile.email}</p>
                  </div>

                  {userProfile.instagram && (
                    <div>
                      <span className="block text-xs font-semibold text-[#001F58]/60 uppercase">
                        Instagram
                      </span>
                      <a
                        href={formatUrl(userProfile.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-1 text-pink-700 font-semibold hover:underline"
                      >
                        📸 {userProfile.instagram}
                      </a>
                    </div>
                  )}

                  {userProfile.facebook && (
                    <div>
                      <span className="block text-xs font-semibold text-[#001F58]/60 uppercase">
                        Facebook
                      </span>
                      <a
                        href={formatUrl(userProfile.facebook)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-1 text-blue-700 font-semibold hover:underline"
                      >
                        🌐 {userProfile.facebook}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading font-bold text-xl text-[#001F58]">
                  {isOwner ? "Mis Publicaciones" : `Aeronaves de ${userProfile.name || "este vendedor"}`}
                </h2>
                <p className="text-xs text-[#001F58]/70">
                  {isOwner
                    ? "Gestión y control de vigencia de tus avisos."
                    : "Explora la lista de aeronaves disponibles."}
                </p>
              </div>

              {isOwner && (
                <Link
                  href="/publish"
                  className="px-4 py-2 rounded-xl bg-[#001F58] text-white text-xs font-medium hover:bg-[#001F58]/90 transition-all shadow-sm"
                >
                  + Nueva Publicación
                </Link>
              )}
            </div>

            {userListings.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-10 text-center border border-[#001F58]/15">
                <p className="text-base font-semibold text-[#001F58] mb-2">
                  {isOwner
                    ? "Aún no tienes aeronaves publicadas"
                    : "Este vendedor no tiene publicaciones activas"}
                </p>
                {isOwner && (
                  <Link
                    href="/publish"
                    className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[#001F58] text-white text-sm font-medium hover:bg-[#001F58]/90 transition-all"
                  >
                    Publicar Ahora
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {userListings.map((listing) => {
                  const now = new Date();
                  const expiresAt = listing.listingExpiresAt
                    ? new Date(listing.listingExpiresAt)
                    : null;

                  let diffDays = 0;
                  let isExpired = false;

                  if (expiresAt) {
                    const diffTime = expiresAt.getTime() - now.getTime();
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    isExpired = diffDays <= 0;
                  }

                  const firstImageUrl = listing.images[0]?.url;

                  return (
                    <div
                      key={listing.id}
                      className="bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-[#001F58]/10">
                          {firstImageUrl ? (
                            <Image
                              src={firstImageUrl}
                              alt={listing.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-[#001F58]/40 font-bold">
                              SIN FOTO
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="font-heading font-bold text-base text-[#001F58] mb-1 line-clamp-1">
                            {listing.title}
                          </h3>
                          <p className="text-sm font-extrabold text-[#001F58]">
                            {!listing.price
                              ? "Consultar Precio"
                              : `$${Number(listing.price).toLocaleString("es-AR")}`}
                          </p>

                          {isOwner && (
                            <div className="mt-2 flex items-center gap-2">
                              {listing.status === "PENDING_PAYMENT" ? (
                                <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-md font-semibold border border-yellow-200">
                                  ⏳ Pendiente de Pago
                                </span>
                              ) : isExpired ? (
                                <span className="text-[10px] bg-red-100 text-red-800 px-2.5 py-0.5 rounded-md font-semibold border border-red-200">
                                  ⚠️ Vencida
                                </span>
                              ) : expiresAt ? (
                                <span
                                  className={`text-[10px] px-2.5 py-0.5 rounded-md font-semibold border ${
                                    diffDays <= 7
                                      ? "bg-amber-100 text-amber-900 border-amber-200"
                                      : "bg-emerald-100 text-emerald-900 border-emerald-200"
                                  }`}
                                >
                                  ⏳ Quedan {diffDays} días
                                </span>
                              ) : (
                                <span className="text-[10px] bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-md font-semibold">
                                  Estado: {listing.status}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col items-end gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#001F58]/10">
                        {isOwner && (
                          <form action={extendListing} className="w-full sm:w-auto">
                            <input type="hidden" name="listingId" value={listing.id} />
                            <Button
                              type="submit"
                              size="sm"
                              className="w-full sm:w-auto bg-[#001F58] hover:bg-[#001F58]/90 text-white text-xs font-medium rounded-xl px-3 py-1.5"
                            >
                              ➕ Extender 45 días (1 cupo)
                            </Button>
                          </form>
                        )}

                        <div className="flex items-center gap-2 w-full justify-end">
                          <Link
                            href={`/publicacion/${listing.id}`}
                            className="text-xs font-medium text-[#001F58]/80 hover:text-[#001F58] underline px-1"
                          >
                            Ver Publicación
                          </Link>

                          {isOwner && (
                            <>
                              <span className="text-[#001F58]/20">•</span>
                              <Link
                                href={`/editar-publicacion/${listing.id}`}
                                className="text-xs font-medium text-[#001F58]/80 hover:text-[#001F58] underline px-1"
                              >
                                Editar
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isViewImageOpen && userProfile.image && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setIsViewImageOpen(false)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold hover:bg-black transition-all"
            >
              ✕
            </button>
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
              <Image
                src={userProfile.image}
                alt={userProfile.name || "Foto de perfil"}
                fill
                className="object-contain bg-slate-900"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}