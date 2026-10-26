"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { resendVerificationEmailAction } from "@/app/actions/verification-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageBackground } from "@/components/ui/PageBackground";
import { FlightPaths } from "@/components/ui/home/FlightPaths";

interface LoginFormProps {
  // Vienen de la página (searchParams del servidor). Antes se leían con useSearchParams dentro
  // de un <Suspense>, y ese bloque nunca hidrataba: el formulario se enviaba nativo (VA-20).
  errorParam?: string | null;
  successParam?: string | null;
  callbackParam?: string | null;
}

export default function LoginForm({ errorParam = null, successParam = null, callbackParam = null }: LoginFormProps) {
  // Solo rutas internas, para no redirigir a otro sitio.
  const callbackUrl =
    callbackParam && /^\/(?![/\\])/.test(callbackParam)
      ? callbackParam
      : "/";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Email del último intento, para "Reenviar mail de verificación".
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    setResendStatus(await resendVerificationEmailAction(pendingEmail));
    setResending(false);
  };

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
      // Auth.js v5 manda el motivo en res.code (CredentialsSignin con code, ver lib/auth.ts).
      if (res.code === "EmailNotVerified") {
        setPendingEmail(email);
        setResendStatus(null);
        setErrorMessage("EmailNotVerified");
      } else {
        setErrorMessage("CredentialsSignin");
      }
    } else {
      window.location.href = callbackUrl;
    }
  };

  return (
    <main className="relative isolate overflow-hidden min-h-screen flex items-center justify-center py-16">
      <PageBackground page="login" />

      <div className="container mx-auto px-4 max-w-md">
        {/* Rediseño (26/10): tarjeta de vidrio sobre el fondo, con el encabezado en la franja azul de la marca. */}
        <div className="overflow-hidden rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-[0_30px_60px_-30px_rgb(0_32_91/0.55)] backdrop-blur-xl space-y-6">
          {/* Encabezado */}
          <div className="relative isolate -mx-8 -mt-8 overflow-hidden bg-[linear-gradient(120deg,#0A4C96_0%,#00205B_72%)] px-8 py-8 text-white">
            <FlightPaths id="va-route-login" tone="dark" className="-z-10" />
            <h1 className="va-h1-keep font-heading text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
              Ingresá a tu cuenta
            </h1>
            <p className="mt-1.5 text-xs text-white/85 sm:text-sm">
              Ingresá a tu cuenta para gestionar tus publicaciones
            </p>
          </div>

          {/* Botones de Auth Social */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full gap-2 bg-white/80 border-[#00205B]/20 hover:bg-white text-[#00205B] font-medium rounded-xl shadow-sm cursor-pointer"
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
                  d="M10.7 28.1c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.1-5.5C2 16.6 1.5 20.2 1.5 24s.5 7.4 2.1 10.6l7.1-5.5z"
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
              onClick={() => signIn("facebook", { callbackUrl })}
              className="w-full gap-2 bg-white/80 border-[#00205B]/20 hover:bg-white text-[#00205B] font-medium rounded-xl shadow-sm cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z" />
              </svg>
              Continuar con Facebook
            </Button>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3 py-0.5">
            <Separator className="flex-1 bg-[#00205B]/15" />
            <span className="text-xs text-[#00205B]/60 uppercase font-medium">o</span>
            <Separator className="flex-1 bg-[#00205B]/15" />
          </div>

          {/* MENSAJES Y ALERTAS */}
          {successParam === "EmailVerified" && (
            <div className="rounded-xl bg-green-50 p-3 text-xs sm:text-sm text-green-700 border border-green-200">
              ¡Casilla de correo verificada con éxito! Ya podés iniciar sesión.
            </div>
          )}

          {successParam === "PasswordReset" && (
            <div className="rounded-xl bg-green-50 p-3 text-xs sm:text-sm text-green-700 border border-green-200">
              Listo, guardamos tu contraseña nueva. Ya podés iniciar sesión.
            </div>
          )}

          {(errorMessage === "CredentialsSignin" || errorParam === "CredentialsSignin") && (
            <div className="rounded-xl bg-red-50 p-3 text-xs sm:text-sm text-red-600 border border-red-200">
              Email o contraseña incorrectos. Por favor, verificá tus datos.
            </div>
          )}

          {errorMessage === "EmailNotVerified" && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs sm:text-sm text-amber-700 border border-amber-200">
              <p>Debés activar tu cuenta desde el link enviado a tu casilla de correo antes de ingresar.</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-2 font-semibold underline hover:text-amber-900 disabled:opacity-50 cursor-pointer"
              >
                {resending ? "Enviando..." : "Reenviar mail de verificación"}
              </button>
              {resendStatus && (
                <p className={`mt-1 ${resendStatus.ok ? "text-green-700" : "text-red-600"}`}>{resendStatus.message}</p>
              )}
            </div>
          )}

          {/* Formulario de Credentials */}
          {/* method="post": si se envía antes de que cargue React, la contraseña no queda en la URL */}
          <form method="post" onSubmit={handleCredentialsLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-[#00205B]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="bg-white/80 border-[#00205B]/20 focus-visible:ring-[#00205B]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="password" className="text-xs font-semibold text-[#00205B]">
                  Contraseña
                </Label>
                {/* VA-105 · 3 */}
                <Link href="/forgot-password" className="text-xs font-semibold text-[#00205B]/80 hover:text-[#D62828] hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="bg-white/80 border-[#00205B]/20 focus-visible:ring-[#00205B] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00205B] transition-colors p-1"
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
              className="w-full mt-2 bg-[#D62828] hover:bg-[#c00d1a] text-white font-medium py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-70"
            >
              {loading ? "Ingresando..." : "Continuar con email"}
            </Button>
          </form>

          <p className="text-xs sm:text-sm text-[#00205B]/70 pt-2 border-t border-[#00205B]/10">
            ¿No tenés cuenta?{" "}
            <Link
              href="/register"
              className="text-[#D62828] font-semibold hover:underline transition-colors"
            >
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}