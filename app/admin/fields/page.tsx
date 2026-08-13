import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(currentUser as any).isAdmin) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      _count: {
        select: {
          aircrafts: true,
          spareParts: true,
        },
      },
    },
  });

  async function toggleAdminRole(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;
    const currentIsAdmin = formData.get("currentIsAdmin") === "true";

    await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: !currentIsAdmin },
    });

    redirect("/admin/users");
  }

  async function deleteUser(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;

    const sessionUser = await getCurrentUser();
    if (sessionUser?.id === userId) {
      throw new Error("No puedes eliminar tu propia cuenta de administrador.");
    }

    await prisma.aircraft.deleteMany({
      where: {
        seller: { id: userId }, 
      },
    });

    await prisma.sparePart.deleteMany({
      where: {
        seller: { id: userId }, 
      },
    }).catch(() => {
    });

    await prisma.user.delete({
      where: { id: userId },
    });

    redirect("/admin/users");
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
        <div className="container mx-auto px-4 pt-16 pb-36 max-w-6xl">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#001F58]/15">
            <div>
              <Link
                href="/admin"
                className="text-xs font-bold text-[#001F58]/70 hover:text-[#001F58] mb-2 inline-block"
              >
                ← Volver al Panel
              </Link>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#001F58]">
                Gestión de Usuarios
              </h1>
              <p className="text-sm text-[#001F58]/70">
                Listado total de cuentas registradas en la plataforma.
              </p>
            </div>
          </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#001F58]/15 shadow-sm overflow-hidden">
          
          
        </div>
      </div>
    </main>
  );
}