import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export async function addCreditsToUser(userEmail: string, amount: number) {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    throw new Error("No existe un usuario registrado con este correo.");
  }

  await prisma.user.update({
    where: { email: userEmail },
    data: {
      aircraftListingsBalance: { increment: amount },
    },
  });
}

export default async function AdminCreditsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(currentUser as any).isAdmin) {
    redirect("/");
  }

  async function addCredits(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const aircraftAmount = parseInt((formData.get("aircraftAmount") as string) || "0", 10);
    const sparePartsAmount = parseInt((formData.get("sparePartsAmount") as string) || "0", 10);

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          aircraftListingsBalance: {
            increment: aircraftAmount,
          },
          sparePartsListingsBalance: {
            increment: sparePartsAmount,
          },
        },
      });
    }

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

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-xl">
        <Link
          href="/admin"
          className="text-xs font-bold text-[#001F58]/70 hover:text-[#001F58] mb-4 inline-block"
        >
          ← Volver al Panel
        </Link>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#001F58]/15 p-6 shadow-sm">
          <h1 className="font-heading text-xl font-bold text-[#001F58] mb-1">
            ➕ Cargar Cupos de Publicación
          </h1>
          <p className="text-xs text-[#001F58]/70 mb-6">
            Asigna cupos adicionales para aeronaves o repuestos a un usuario mediante su email registrado.
          </p>

          <form action={addCredits} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#001F58] mb-1">
                Email del Usuario
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="ejemplo@correo.com"
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#001F58]/20 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#001F58] mb-1">
                  Cupos Aeronaves
                </label>
                <input
                  type="number"
                  name="aircraftAmount"
                  defaultValue="1"
                  min="0"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#001F58]/20 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#001F58] mb-1">
                  Cupos Repuestos
                </label>
                <input
                  type="number"
                  name="sparePartsAmount"
                  defaultValue="0"
                  min="0"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#001F58]/20 bg-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#001F58] hover:bg-[#001F58]/90 text-white rounded-xl py-2 mt-4 text-xs font-bold"
            >
              Cargar Cupos
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}