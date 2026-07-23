import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getAvailableCredits } from "@/lib/credits";
import { Button } from "@/components/ui/button";


export default async function ProfileDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const currentUser = await getCurrentUser();

  const isOwner = currentUser?.id === id;

  const userProfile = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      createdAt: true,
    },
  });

  if (!userProfile) {
    notFound();
  }

  const credits = isOwner ? await getAvailableCredits(currentUser.id) : 0;

  const userListings = await prisma.aircraft.findMany({
    where: {
      sellerId: id,
      ...(!isOwner && { status: "ACTIVE" }),
    },
    include: {
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  async function updateProfile(formData: FormData) {
    "use server";
    if (!currentUser || currentUser.id !== id) {
      throw new Error("No autorizado");
    }

    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    await prisma.user.update({
      where: { id },
      data: { name, phone },
    });

    redirect(`/profile/${id}?updated=true`);
  }

  async function extendListing(formData: FormData) {
    "use server";
    if (!currentUser || currentUser.id !== id) {
      throw new Error("No autorizado");
    }

    const listingId = formData.get("listingId") as string;
    const currentCredits = await getAvailableCredits(currentUser.id);
    const RENEWAL_COST = 2;

    if (currentCredits < RENEWAL_COST) {
      redirect("/planes?error=insufficient_credits");
    }

    const listing = await prisma.aircraft.findUniqueOrThrow({
      where: { id: listingId },
    });

    const currentExpiration = listing.listingExpiresAt
      ? new Date(listing.listingExpiresAt)
      : new Date();
    const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
    const newExpiresAt = new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: {
          creditsBalance: { decrement: RENEWAL_COST },
        },
      }),
      prisma.aircraft.update({
        where: { id: listingId },
        data: {
          listingExpiresAt: newExpiresAt,
          status: "ACTIVE",
        },
      }),
    ]);

    redirect(`/profile/${id}?renewed=true`);
  }

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      <Image
        src="/bkg-plans.jpg"
        alt="Fondo Perfil"
        fill
        priority
        className="-z-20 object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-background/85 backdrop-blur-[2px]" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-6xl">
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-[#001F58]/15">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#001F58] text-white flex items-center justify-center font-bold text-2xl shadow-md uppercase">
              {userProfile.name ? userProfile.name.charAt(0) : "U"}
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#001F58]">
                {userProfile.name || "Vendedor"}
              </h1>
              {/* Mostramos el email solo si es el dueño o como contacto público si lo deseas */}
              <p className="text-sm text-[#001F58]/70">
                {isOwner ? userProfile.email : `Miembro desde ${new Date(userProfile.createdAt).getFullYear()}`}
              </p>
            </div>
          </div>

          {/* TARJETA DE CRÉDITOS: Solo visible para el Propietario */}
          {isOwner && (
            <div className="bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl p-4 sm:px-6 flex items-center justify-between gap-6 shadow-sm">
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-[#001F58]/60">
                  Créditos Disponibles
                </p>
                <p className="font-heading text-3xl font-black text-[#001F58]">
                  {credits} <span className="text-sm font-normal text-[#001F58]/70">crédito{credits !== 1 ? "s" : ""}</span>
                </p>
              </div>
              <Link
                href="/planes"
                className="px-4 py-2.5 rounded-xl bg-[#E70F1F] hover:bg-[#c00d1a] text-white font-medium text-sm transition-all shadow-sm"
              >
                Cargar Créditos
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUMNA IZQUIERDA: Formulario Editable vs. Tarjeta de Contacto Pública */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-[#001F58]/15 shadow-sm sticky top-24">
              <h2 className="font-heading font-bold text-lg text-[#001F58] mb-1">
                {isOwner ? "Mis Datos de Perfil" : "Información del Vendedor"}
              </h2>
              <p className="text-xs text-[#001F58]/70 mb-6">
                {isOwner
                  ? "Información personal asociada a tus publicaciones."
                  : "Datos de contacto directo para realizar consultas."}
              </p>

              {isOwner ? (
                /* MODO DUENIO: Formulario editable */
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

                  <Button
                    type="submit"
                    className="w-full bg-[#001F58] hover:bg-[#001F58]/90 text-white rounded-xl py-2.5 font-medium text-sm mt-2"
                  >
                    Guardar Datos
                  </Button>
                </form>
              ) : (
                /* MODO VISITANTE: Datos de lectura */
                <div className="space-y-4 text-sm text-[#001F58]">
                  <div>
                    <span className="block text-xs font-semibold text-[#001F58]/60 uppercase">
                      Nombre
                    </span>
                    <p className="font-medium text-base">{userProfile.name || "No especificado"}</p>
                  </div>

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
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: Listado de Aeronaves */}
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
                            {listing.priceOnRequest || !listing.price
                              ? "Consultar Precio"
                              : `$${Number(listing.price).toLocaleString("es-AR")}`}
                          </p>

                          {/* Banderas de estado (Solo visibles/relevantes para el dueño) */}
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

                      {/* Acciones */}
                      <div className="flex flex-wrap sm:flex-col items-end gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#001F58]/10">
                        {/* Botón Extender: Solo para el dueño */}
                        {isOwner && (
                          <form action={extendListing} className="w-full sm:w-auto">
                            <input type="hidden" name="listingId" value={listing.id} />
                            <Button
                              type="submit"
                              size="sm"
                              className="w-full sm:w-auto bg-[#001F58] hover:bg-[#001F58]/90 text-white text-xs font-medium rounded-xl px-3 py-1.5"
                            >
                              ➕ Extender 45 días (2 créd.)
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

                          {/* Botón Editar: Solo para el dueño */}
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
    </main>
  );
}