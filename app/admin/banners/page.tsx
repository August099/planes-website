import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export default async function AdminBannersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(currentUser as any).isAdmin) {
    redirect("/");
  }

  const bannerRequests =
    (await (prisma as any).bannerRequest
      ?.findMany({
        orderBy: { createdAt: "desc" },
      })
      .catch(() => [])) ?? [];

  async function toggleBannerState(formData: FormData) {
    "use server";
    const requestId = formData.get("requestId") as string;
    const currentStatus = formData.get("currentStatus") as string;
    const newStatus = currentStatus === "APPROVED" ? "REJECTED" : "APPROVED";

    if ((prisma as any).bannerRequest) {
      await (prisma as any).bannerRequest.update({
        where: { id: requestId },
        data: { status: newStatus },
      });
    }

    redirect("/admin/banners");
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

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-5xl">
        <Link
          href="/admin"
          className="text-xs font-bold text-[#001F58]/70 hover:text-[#001F58] mb-4 inline-block"
        >
          ← Volver al Panel
        </Link>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#001F58]">
              🖼️ Banners Publicitarios Activos
            </h1>
            <p className="text-xs text-[#001F58]/70">
              Administra qué espacios publicitarios se muestran activamente en la web.
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#001F58]/15 p-6 shadow-sm space-y-4">
          {bannerRequests.length === 0 ? (
            <p className="text-xs text-[#001F58]/60 text-center py-8">
              No hay banners registrados en la base de datos.
            </p>
          ) : (
            bannerRequests.map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between border border-[#001F58]/10 rounded-xl p-4 bg-white"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-[#001F58]">
                      {b.companyName || "Anunciante sin nombre"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        b.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#001F58]/70">
                    Posición: {b.bannerType || "General"} | Email: {b.email}
                  </p>
                </div>

                <form action={toggleBannerState}>
                  <input type="hidden" name="requestId" value={b.id} />
                  <input type="hidden" name="currentStatus" value={b.status} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={b.status === "APPROVED" ? "destructive" : "default"}
                    className="text-xs rounded-xl"
                  >
                    {b.status === "APPROVED" ? "Pausar / Desactivar" : "Activar Banner"}
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}