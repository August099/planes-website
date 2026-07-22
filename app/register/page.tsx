import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/ui/AuthLayout";
import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const errorMessage = params?.error;

  async function register(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Verificar si el usuario ya existe
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return redirect("/register?error=EmailExists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Crear el usuario unificado (sin sellerType)
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    // Iniciar sesión e ir al panel
    try {
      await signIn("credentials", { email, password, redirectTo: "/panel" });
    } catch (error) {
      if (error instanceof AuthError) {
        return redirect("/login?error=CredentialsSignin");
      }
      throw error;
    }
  }

  return (
    <AuthLayout title="Crear cuenta" subtitle="Ventas Aeronáuticas">
      {/* Alertas de error */}
      {errorMessage === "EmailExists" && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
          Ya existe una cuenta registrada con ese correo electrónico.
        </div>
      )}

      <form action={register} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="name">Nombre completo</Label>
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