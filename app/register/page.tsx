import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const errorMessage = params?.error;

  async function register(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
      return redirect("/register?error=MissingFields");
    }

    // 1. Verificar si el usuario ya existe
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return redirect("/register?error=EmailExists");
    }

    // 2. Crear el hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Crear el usuario en la BD de Prisma
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    // 4. Iniciar sesión con el usuario recién creado
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return redirect("/login?error=CredentialsSignin");
      }
      throw error;
    }
  }

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16 flex items-center justify-center py-16">
      <Image
        src="/bkg-register.jpg"
        alt="Fondo Registro"
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="container mx-auto px-4 max-w-md">
        <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-8 backdrop-blur-sm shadow-xl space-y-6">
          
          <div className="text-center space-y-1.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#001F58]">
              CREAR CUENTA
            </h1>
            <p className="text-xs sm:text-sm text-[#001F58]/70">
              Ingresá tus datos para comenzar a publicar en Ventas Aeronáuticas
            </p>
          </div>

          {errorMessage === "EmailExists" && (
            <div className="rounded-xl bg-red-50 p-3 text-xs sm:text-sm text-red-600 border border-red-200">
              Ya existe una cuenta registrada con ese correo electrónico.
            </div>
          )}
          {errorMessage === "MissingFields" && (
            <div className="rounded-xl bg-red-50 p-3 text-xs sm:text-sm text-red-600 border border-red-200">
              Por favor completá todos los campos.
            </div>
          )}

          <form action={register} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-[#001F58]">
                Nombre completo
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                className="bg-white/80 border-[#001F58]/20 focus-visible:ring-[#001F58]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-[#001F58]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="bg-white/80 border-[#001F58]/20 focus-visible:ring-[#001F58]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-[#001F58]">
                Contraseña
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                className="bg-white/80 border-[#001F58]/20 focus-visible:ring-[#001F58]"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-[#E70F1F] hover:bg-[#c00d1a] text-white font-medium py-2.5 rounded-xl shadow-sm transition-colors"
            >
              Crear cuenta
            </Button>
          </form>

          <p className="text-center text-xs sm:text-sm text-[#001F58]/70 pt-2 border-t border-[#001F58]/10">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="text-[#E70F1F] font-semibold hover:underline transition-colors"
            >
              Ingresá
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}