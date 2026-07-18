import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/ui/AuthLayout";
import bcrypt from "bcryptjs";
import Link from "next/link";

export default function RegisterPage() {
  async function register(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const sellerType = formData.get("sellerType") as "PARTICULAR" | "MAYORISTA";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Ya existe una cuenta con ese email");

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { name, email, passwordHash, sellerType } });

    await signIn("credentials", { email, password, redirectTo: "/panel" });
  }

  return (
    <AuthLayout title="Crear cuenta" subtitle="Ventas Aeronáuticas">
      <form action={register} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" type="text" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>

        <div className="space-y-2 pt-2">
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

        <Button type="submit" className="w-full mt-2 bg-[#E70F1F] hover:bg-[#c00d1a]">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-[#E70F1F] font-medium hover:underline">
          Ingresá
        </Link>
      </p>
    </AuthLayout>
  );
}