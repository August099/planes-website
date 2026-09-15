"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const successParam = searchParams.get("success");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCredentialsLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error.includes("EmailNotVerified")) {
        setErrorMessage("EmailNotVerified");
      } else {
        setErrorMessage("CredentialsSignin");
      }
    } else {
      window.location.href = "/";
    }
  };

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16 flex items-center justify-center py-16">
      <Image
        src="/bkg-login.jpg"
        alt="Fondo Iniciar Sesión"
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="container mx-auto px-4 max-w-md">
        <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-8 backdrop-blur-sm shadow-xl space-y-6">
          
          {/* Encabezado */}
          <div className="text-center space-y-1.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#001F58]">
              BIENVENIDO DE NUEVO
            </h1>
            <p className="text-xs sm:text-sm text-[#001F58]/70">
              Ingresá a tu cuenta para gestionar tus publicaciones
            </p>
          </div>

          {/* Botones de Auth Social */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full gap-2 bg-white/80 border-[#001F58]/20 hover:bg-white text-[#001F58] font-medium rounded-xl shadow-sm cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l6-5.9C34.6 3.4 30 1.5 24 1.5 14.9 1.5 7.1 6.9 3.6 14.6l7.1 5.5C12.4 14.1 17.7 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.6c-.5 3-2.2 5.5-4.7 7.2l7.1 5.5c4.2-3.9 6.5-9.6 6.5-17.2z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.7 28.1c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.1-5.5C2 16.6 1.5 20.2 1.5 24s.5 7.4 2.1 10.6l7.1 5.5z"
                />
                <path
                  fill="#34A853"
                  d="M24 46.5c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-6.3 0-11.6-4.6-13.3-10.6l-7.1 5.5C7.1 41.1 14.9 46.5 24 46.5z"
                />
              </svg>
              Continuar con Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => signIn("facebook", { callbackUrl: "/" })}
              className="w-full gap-2 bg-white/80 border-[#001F58]/20 hover:bg-white text-[#001F58] font-medium rounded-xl shadow-sm cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z" />
              </svg>
              Continuar con Facebook
            </Button>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3 py-0.5">
            <Separator className="flex-1 bg-[#001F58]/15" />
            <span className="text-xs text-[#001F58]/60 uppercase font-medium">o</span>
            <Separator className="flex-1 bg-[#001F58]/15" />
          </div>

          {/* MENSAJES Y ALERTAS */}
          {successParam === "EmailVerified" && (
            <div className="rounded-xl bg-green-50 p-3 text-xs sm:text-sm text-green-700 border border-green-200">
              ¡Casilla de correo verificada con éxito! Ya podés iniciar sesión.
            </div>
          )}

          {(errorMessage === "CredentialsSignin" || errorParam === "CredentialsSignin") && (
            <div className="rounded-xl bg-red-50 p-3 text-xs sm:text-sm text-red-600 border border-red-200">
              Email o contraseña incorrectos. Por favor, verificá tus datos.
            </div>
          )}

          {errorMessage === "EmailNotVerified" && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs sm:text-sm text-amber-700 border border-amber-200">
              Debés activar tu cuenta desde el link enviado a tu casilla de correo antes de ingresar.
            </div>
          )}

          {/* Formulario de Credentials */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
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
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="bg-white/80 border-[#001F58]/20 focus-visible:ring-[#001F58] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#001F58] transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#E70F1F] hover:bg-[#c00d1a] text-white font-medium py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-70"
            >
              {loading ? "Ingresando..." : "Continuar con email"}
            </Button>
          </form>

          <p className="text-center text-xs sm:text-sm text-[#001F58]/70 pt-2 border-t border-[#001F58]/10">
            ¿No tenés cuenta?{" "}
            <Link
              href="/register"
              className="text-[#E70F1F] font-semibold hover:underline transition-colors"
            >
              Registrate
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}