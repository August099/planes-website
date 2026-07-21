// src/app/complete-profile/page.tsx
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { AuthLayout } from "@/components/ui/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

export default async function CompleteProfilePage() {
  const user = await requireUser();

  async function completeProfile(formData: FormData) {
    "use server";
    const phone = formData.get("phone") as string;
    const sellerType = formData.get("sellerType") as "PARTICULAR" | "MAYORISTA";

    await prisma.user.update({
      where: { id: user.id },
      data: { phone: phone || undefined, sellerType },
    });

    redirect("/panel");
  }

  return (
    <AuthLayout title="Un último paso" subtitle="Contanos un poco más sobre vos">
      <form action={completeProfile} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input id="phone" name="phone" type="tel" placeholder="11 1234 5678" />
        </div>

        <div className="space-y-2">
          <Label>Tipo de cuenta</Label>
          <label className="flex items-center gap-2 border rounded-md p-3 text-sm">
            <input type="radio" name="sellerType" value="PARTICULAR" required />
            Particular
          </label>
          <label className="flex items-center gap-2 border rounded-md p-3 text-sm">
            <input type="radio" name="sellerType" value="MAYORISTA" />
            Mayorista / Comisionista
          </label>
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-2">
          Continuar
        </Button>
      </form>
    </AuthLayout>
  );
}