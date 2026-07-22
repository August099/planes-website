import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getAvailableCredits } from "@/lib/credits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

export default async function ProfileDashboardPage() {
  /*const user = await requireUser();

  // Obtener créditos del usuario
  const credits = await getAvailableCredits(user.id);

  // Obtener perfil completo desde la BD
  const userProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      whatsapp: true,
      location: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Obtener publicaciones del usuario (usando sellerId o userId con respaldo)
  const userListings = await prisma.aircraft.findMany({
    where: {
      OR: [
        { sellerId: user.id },
        { userId: user.id },
      ] as any,
    },
    orderBy: { createdAt: "desc" },
  });

  // Action para guardar datos predeterminados
  async function updateProfile(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const whatsapp = formData.get("whatsapp") as string;
    const location = formData.get("location") as string;

    await prisma.user.update({
      where: { id: user.id },
      data: { name, phone, whatsapp, location },
    });

    redirect("/perfil?updated=true");
  }

  // Action para extender la duración de una publicación (+45 días) por créditos
  async function extendListing(formData: FormData) {
    "use server";
    const listingId = formData.get("listingId") as string;
    const currentCredits = await getAvailableCredits(user.id);

    const RENEWAL_COST = 2; // Costo en créditos para renovar 45 días

    if (currentCredits < RENEWAL_COST) {
      redirect("/planes?error=insufficient_credits");
    }

    const listing: any = await prisma.aircraft.findUniqueOrThrow({
      where: { id: listingId },
    });

    // Calcular nueva fecha de vencimiento (+45 días desde hoy o desde el vencimiento si aún estaba activa)
    const currentExpiration = listing.expiresAt ? new Date(listing.expiresAt) : new Date();
    const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
    const newExpiresAt = new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000);

    // Descontar créditos y actualizar aviso
    await prisma.$transaction([
      prisma.purchase.create({
        data: {
          userId: user.id,
          planId: "RENEWAL",
          creditsTotal: -RENEWAL_COST,
          creditsRemaining: 0,
          paymentStatus: "APPROVED",
        },
      }),
      prisma.aircraft.update({
        where: { id: listingId },
        data: {
          expiresAt: newExpiresAt,
          status: "ACTIVE",
        } as any,
      }),
    ]);

    redirect("/perfil?renewed=true");
  }
  */
  return <></>/*(
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      <Image
        src="/bkg-plans.jpg"
        alt="Fondo Mi Perfil"
        fill
        priority
        className="-z-20 object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-background/85 backdrop-blur-[2px]" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-[#001F58]/15">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#001F58] text-white flex items-center justify-center font-bold text-2xl shadow-md uppercase">
              {userProfile?.name ? userProfile.name.charAt(0) : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#001F58]">
                  {userProfile?.name || "Mi Cuenta"}
                </h1>
                {userProfile?.isVerified && (
                  <Badge className="bg-blue-100 text-blue-900 border-blue-200">
                    ✓ Verificado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[#001F58]/70">{userProfile?.email}</p>
            </div>
          </div>

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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-[#001F58]/15 shadow-sm sticky top-24">
              <h2 className="font-heading font-bold text-lg text-[#001F58] mb-1">
                Datos de Contacto
              </h2>
              <p className="text-xs text-[#001F58]/70 mb-6">
                Estos datos se autocompletarán cuando crees un nuevo aviso.
              </p>

              <form action={updateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#001F58] mb-1">
                    Nombre o Nombre Comercial
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={userProfile?.name || ""}
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
                    defaultValue={userProfile?.phone || ""}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#001F58]/20 bg-white text-sm text-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/30"
                    placeholder="Ej. +54 11 1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#001F58] mb-1">
                    WhatsApp para Consultas
                  </label>
                  <input
                    type="text"
                    name="whatsapp"
                    defaultValue={userProfile?.whatsapp || ""}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#001F58]/20 bg-white text-sm text-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/30"
                    placeholder="Ej. +5491112345678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#001F58] mb-1">
                    Ubicación (Base / Aeródromo / Ciudad)
                  </label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={userProfile?.location || ""}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#001F58]/20 bg-white text-sm text-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/30"
                    placeholder="Ej. Aeródromo de Morón, Buenos Aires"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#001F58] hover:bg-[#001F58]/90 text-white rounded-xl py-2.5 font-medium text-sm mt-2"
                >
                  Guardar Predeterminados
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-[#001F58]/10 text-center">
                <Link
                  href={`/vendedor/${user.id}`}
                  className="text-xs font-semibold text-[#001F58] hover:underline"
                >
                  🔗 Ver mi Perfil Público de Vendedor
                </Link>
              </div>
            </div>
          </div>

          
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading font-bold text-xl text-[#001F58]">
                  Mis Publicaciones
                </h2>
                <p className="text-xs text-[#001F58]/70">
                  Las publicaciones permanecen activas por 45 días.
                </p>
              </div>
              <Link
                href="/publish"
                className="px-4 py-2 rounded-xl bg-[#001F58] text-white text-xs font-medium hover:bg-[#001F58]/90 transition-all shadow-sm"
              >
                + Nueva Publicación
              </Link>
            </div>

            {userListings.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-10 text-center border border-[#001F58]/15">
                <p className="text-base font-semibold text-[#001F58] mb-2">
                  Aún no tienes publicaciones activas
                </p>
                <p className="text-xs text-[#001F58]/70 mb-6">
                  Publica tu aeronave o repuesto en el marketplace líder de aviación.
                </p>
                <Link
                  href="/publish"
                  className="px-5 py-2.5 rounded-xl bg-[#001F58] text-white text-sm font-medium hover:bg-[#001F58]/90 transition-all"
                >
                  Publicar Ahora
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {userListings.map((listing: any) => {
                  const now = new Date();
                  // Si expiresAt no está definido en el registro antiguo, toma createdAt + 45 días como fallback
                  const expiresAt = listing.expiresAt
                    ? new Date(listing.expiresAt)
                    : new Date(new Date(listing.createdAt).getTime() + 45 * 24 * 60 * 60 * 1000);

                  const diffTime = expiresAt.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const isExpired = diffDays <= 0;

                  return (
                    <div
                      key={listing.id}
                      className="bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                       
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-[#001F58]/10">
                          {listing.images?.[0] ? (
                            <Image
                              src={listing.images[0]}
                              alt={listing.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-[#001F58]/40 font-bold">
                              SIN FOTO
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="font-heading font-bold text-base text-[#001F58] mb-1">
                            {listing.title}
                          </h3>
                          <p className="text-sm font-extrabold text-[#001F58]">
                            ${Number(listing.price).toLocaleString("es-AR")}
                          </p>

                        
                          <div className="mt-2 flex items-center gap-2">
                            {isExpired ? (
                              <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">
                                ⚠️ Vencida
                              </Badge>
                            ) : (
                              <Badge
                                className={`text-[10px] ${
                                  diffDays <= 7
                                    ? "bg-amber-100 text-amber-900 border-amber-200"
                                    : "bg-emerald-100 text-emerald-900 border-emerald-200"
                                }`}
                              >
                                ⏳ Quedan {diffDays} días
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col items-end gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#001F58]/10">
                        <form action={extendListing} className="w-full sm:w-auto">
                          <input type="hidden" name="listingId" value={listing.id} />
                          <Button
                            type="submit"
                            size="sm"
                            className="w-full sm:w-auto bg-[#001F58] hover:bg-[#001F58]/90 text-white text-xs font-medium rounded-xl px-3 py-1.5"
                          >
                            ➕ Sumar 45 días (2 créd.)
                          </Button>
                        </form>

                        <div className="flex items-center gap-2 w-full justify-end">
                          <Link
                            href={`/publicacion/${listing.id}`}
                            className="text-xs font-medium text-[#001F58]/80 hover:text-[#001F58] underline px-1"
                          >
                            Ver
                          </Link>
                          <span className="text-[#001F58]/20">•</span>
                          <Link
                            href={`/editar-publicacion/${listing.id}`}
                            className="text-xs font-medium text-[#001F58]/80 hover:text-[#001F58] underline px-1"
                          >
                            Editar
                          </Link>
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
  */
}