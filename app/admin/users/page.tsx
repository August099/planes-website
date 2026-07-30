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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#001F58]">
              <thead className="bg-[#001F58]/5 border-b border-[#001F58]/10 text-[11px] uppercase font-bold text-[#001F58]/70">
                <tr>
                  <th className="p-4">Usuario</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Aviones Publicados</th>
                  <th className="p-4">Repuestos Publicados</th>
                  <th className="p-4">Fecha Registro</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#001F58]/10">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/60 transition-colors">
                    <td className="p-4">
                      <p className="font-bold">{u.name || "Sin nombre"}</p>
                      <p className="text-[#001F58]/60 text-[11px]">{u.email}</p>
                    </td>
                    <td className="p-4">
                      {u.isAdmin ? (
                        <span className="bg-[#E70F1F] text-white font-extrabold px-2 py-0.5 rounded text-[10px]">
                          ADMIN
                        </span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                          USUARIO
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-center">
                      {u._count.aircrafts ?? 0}
                    </td>
                    <td className="p-4 font-semibold text-center">
                      {u._count.spareParts ?? 0}
                    </td>
                    <td className="p-4 text-[#001F58]/70 text-center">
                      {new Date(u.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form action={toggleAdminRole}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input
                            type="hidden"
                            name="currentIsAdmin"
                            value={String(u.isAdmin)}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="text-[11px] rounded-lg border-[#001F58]/20 h-8"
                          >
                            {u.isAdmin ? "Quitar Admin" : "Hacer Admin"}
                          </Button>
                        </form>

                        {currentUser?.id !== u.id && (
                          <form action={deleteUser}>
                            <input type="hidden" name="userId" value={u.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="destructive"
                              className="text-[11px] rounded-lg h-8 bg-red-600 hover:bg-red-700 text-white"
                            >
                              Eliminar
                            </Button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}