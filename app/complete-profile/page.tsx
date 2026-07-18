import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function CompletarPerfilPage() {
  const user = await requireUser();

  async function completarPerfil(formData: FormData) {
    "use server";
    const sellerType = formData.get("sellerType") as "PARTICULAR" | "MAYORISTA";

    await prisma.user.update({
      where: { id: user.id },
      data: { sellerType },
    });

    redirect("/panel");
  }

  return (
    <main className="max-w-sm mx-auto py-16 px-4">
      <h1 className="text-xl font-medium mb-4">Un último paso</h1>
      <p className="text-muted-foreground mb-6">
        Contanos qué tipo de vendedor sos para mostrarte los planes correctos.
      </p>
      <form action={completarPerfil} className="space-y-3">
        <label className="flex items-center gap-2 border rounded-md p-3">
          <input type="radio" name="sellerType" value="PARTICULAR" required />
          Particular
        </label>
        <label className="flex items-center gap-2 border rounded-md p-3">
          <input type="radio" name="sellerType" value="MAYORISTA" />
          Mayorista / Comisionista
        </label>
        <button className="w-full bg-primary text-white rounded-md py-2 mt-2">
          Continuar
        </button>
      </form>
    </main>
  );
}