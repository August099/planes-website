import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(currentUser as any).isAdmin) {
    redirect("/");
    }

  const [
    totalUsers,
    totalAircraft,
    totalSpareParts,
    pendingReportsCount,
    bannerRequestsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.aircraft.count(),
    prisma.sparePart.count(),
    (prisma as any).report?.count({ where: { status: "PENDING" } }).catch(() => 0) ?? 0,
    (prisma as any).bannerRequest?.count({ where: { status: "PENDING" } }).catch(() => 0) ?? 0,
  ]);

  const bannerRequests = await (prisma as any).bannerRequest
    ?.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    })
    .catch(() => []) ?? [];

  const reports = await (prisma as any).report
    ?.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []) ?? [];

    const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
        select: {
            aircrafts: true, 
            spareParts: true,
        },
        },
    },
    });

  async function handleBannerStatus(formData: FormData) {
    "use server";
    const requestId = formData.get("requestId") as string;
    const action = formData.get("action") as "APPROVE" | "REJECT";

    if ((prisma as any).bannerRequest) {
      await (prisma as any).bannerRequest.update({
        where: { id: requestId },
        data: { status: action === "APPROVE" ? "APPROVED" : "REJECTED" },
      });
    }

    redirect("/admin/dashboard?updated=true");
  }

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      <Image
        src="/bkg-admin.jpg"
        alt="Fondo Admin"
        fill
        priority
        className="-z-20 object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-background/85 backdrop-blur-[2px]" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-[#001F58]/15">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#001F58] text-white flex items-center justify-center font-bold text-2xl shadow-lg shrink-0 border border-white/20">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#001F58]">
                  Panel de Administración
                </h1>
              </div>
              <p className="text-sm text-[#001F58]/70">
                Bienvenido, {currentUser.name || "Administrador"}. Control global de la plataforma.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="px-4 py-2.5 rounded-xl bg-white/80 hover:bg-white text-[#001F58] font-semibold text-xs border border-[#001F58]/20 transition-all shadow-sm"
            >
              Gestionar usuarios
            </Link>
            <Link
              href="/admin/fields"
              className="px-4 py-2.5 rounded-xl bg-white/80 hover:bg-white text-[#001F58] font-semibold text-xs border border-[#001F58]/20 transition-all shadow-sm"
            >
              Gestionar campos
            </Link>
            <Link
              href="/publish"
              className="px-4 py-2.5 rounded-xl bg-[#001F58] hover:bg-[#001F58]/90 text-white font-semibold text-xs transition-all shadow-sm"
            >
              + Publicar oficial
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          <div className="bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#001F58]/60 mb-1">
              ✈️ Aeronaves
            </p>
            <p className="font-heading text-2xl font-black text-[#001F58]">
              {totalAircraft}
            </p>
            <span className="text-[10px] text-[#001F58]/50">Publicadas en total</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#001F58]/60 mb-1">
              ⚙️ Repuestos
            </p>
            <p className="font-heading text-2xl font-black text-[#001F58]">
              {totalSpareParts}
            </p>
            <span className="text-[10px] text-[#001F58]/50">Publicados en catálogo</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#001F58]/60 mb-1">
              👥 Usuarios
            </p>
            <p className="font-heading text-2xl font-black text-[#001F58]">
              {totalUsers}
            </p>
            <span className="text-[10px] text-[#001F58]/50">Cuentas registradas</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#001F58]/60 mb-1">
              📢 Banners
            </p>
            <p className="font-heading text-2xl font-black text-[#E70F1F]">
              {bannerRequestsCount}
            </p>
            <span className="text-[10px] text-[#001F58]/50">Solicitudes pendientes</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#001F58]/60 mb-1">
              🚨 Reportes
            </p>
            <p className="font-heading text-2xl font-black text-amber-600">
              {pendingReportsCount}
            </p>
            <span className="text-[10px] text-[#001F58]/50">Avisos denunciados</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-[#001F58]/15 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#001F58]/10">
                <div>
                  <h2 className="font-heading font-bold text-lg text-[#001F58] flex items-center gap-2">
                    📢 Solicitudes de Banners Publicitarios
                  </h2>
                  <p className="text-xs text-[#001F58]/70">
                    Comprobantes y formularios recibidos para pauta en la web.
                  </p>
                </div>
              </div>

              {bannerRequests.length === 0 ? (
                <div className="bg-white/50 rounded-xl p-8 text-center border border-[#001F58]/10">
                  <p className="text-sm font-medium text-[#001F58]/60">
                    Sin solicitudes de banner pendientes por revisar.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bannerRequests.map((req: any) => (
                    <div
                      key={req.id}
                      className="bg-white/90 border border-[#001F58]/15 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#001F58]">
                            {req.companyName || req.user?.name || "Empresa / Anunciante"}
                          </span>
                          <span className="text-[10px] bg-blue-100 text-[#001F58] font-bold px-2 py-0.5 rounded">
                            {req.bannerType || "Ubicación General"}
                          </span>
                        </div>
                        <p className="text-xs text-[#001F58]/80">
                          ✉️ {req.email || req.user?.email} | 📱 {req.phone || "Sin tel"}
                        </p>
                        {req.proofUrl && (
                          <a
                            href={req.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-[#E70F1F] hover:underline inline-block pt-1"
                          >
                            📄 Ver Comprobante de Pago →
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <form action={handleBannerStatus}>
                          <input type="hidden" name="requestId" value={req.id} />
                          <input type="hidden" name="action" value="APPROVE" />
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl px-3"
                          >
                            Aprobar
                          </Button>
                        </form>
                        <form action={handleBannerStatus}>
                          <input type="hidden" name="requestId" value={req.id} />
                          <input type="hidden" name="action" value="REJECT" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="border-red-200 hover:bg-red-50 text-red-700 text-xs rounded-xl px-3"
                          >
                            Rechazar
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-[#001F58]/15 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#001F58]/10">
                <div>
                  <h2 className="font-heading font-bold text-lg text-[#001F58] flex items-center gap-2">
                    🚨 Reportes de Publicaciones
                  </h2>
                  <p className="text-xs text-[#001F58]/70">
                    Avisos alertados por la comunidad por contenido inadecuado o datos falsos.
                  </p>
                </div>
              </div>

              {reports.length === 0 ? (
                <div className="bg-white/50 rounded-xl p-8 text-center border border-[#001F58]/10">
                  <p className="text-sm font-medium text-[#001F58]/60">
                    No hay reportes de usuarios pendientes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report: any) => (
                    <div
                      key={report.id}
                      className="bg-white/90 border border-[#001F58]/15 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            {report.reason || "Motivo no especificado"}
                          </span>
                          <span className="text-xs text-[#001F58]/50">
                            {new Date(report.createdAt).toLocaleDateString("es-AR")}
                          </span>
                        </div>
                        <p className="text-xs text-[#001F58] font-medium pt-1">
                          {report.comments || "Sin comentarios adicionales por parte del emisor."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {report.aircraftId && (
                          <Link
                            href={`/publicacion/${report.aircraftId}`}
                            className="px-3 py-1.5 rounded-xl bg-[#001F58] hover:bg-[#001F58]/90 text-white text-xs font-medium"
                          >
                            Revisar Aviso
                          </Link>
                        )}
                        {report.sparePartId && (
                          <Link
                            href={`/repuesto/${report.sparePartId}`}
                            className="px-3 py-1.5 rounded-xl bg-[#001F58] hover:bg-[#001F58]/90 text-white text-xs font-medium"
                          >
                            Revisar Repuesto
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}