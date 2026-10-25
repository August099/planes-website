"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, FileText } from "lucide-react";

import { registerUserAction } from "@/app/actions/register-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FreeQuotaNote } from "@/components/ui/FreeQuotaNote";
import { TermsContent } from "@/lib/terms-content";
import { PageBackground } from "@/components/ui/PageBackground";
import { USER_TYPE_OPTIONS } from "@/lib/user-types";

// Formulario de registro. VA-152: el texto del cupo Gratis lo arma app/register/page.tsx (servidor).
export function RegisterForm({ quotaText }: { quotaText: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!acceptedTerms) {
      setErrorMessage("TermsRequired");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.append("termsAccepted", "true");

    const res = await registerUserAction(formData);

    setLoading(false);

    if (res?.error) {
      setErrorMessage(res.error);
    } else if (res?.success) {
      setSuccessMessage(res.success);
    }
  };

  return (
    <main className="relative isolate overflow-hidden min-h-screen flex items-center justify-center py-16">
      <PageBackground page="register" />

      <div className="container mx-auto px-4 max-w-lg">
        <div className="bg-white border border-[#00205B]/12 rounded-lg p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#00205B]">
              Crear cuenta
            </h1>
            <p className="text-xs sm:text-sm text-[#00205B]/70">
              Ingresá tus datos para comenzar a publicar en Ventas Aeronáuticas
            </p>
          </div>

          {/* VA-111: promoción de lanzamiento (se apaga sola en el corte) */}
          <FreeQuotaNote text={quotaText} className="text-left" />

          {/* MENSAJES DE ESTADO */}
          {successMessage === "CheckEmailRetry" && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs sm:text-sm text-amber-700 border border-amber-200">
              ¡Cuenta creada! No pudimos enviarte el mail de activación: pedilo de nuevo desde &quot;Iniciar sesión&quot; con &quot;Reenviar mail de verificación&quot;.
            </div>
          )}

          {successMessage === "CheckEmail" && (
            <div className="rounded-xl bg-green-50 p-3 text-xs sm:text-sm text-green-700 border border-green-200">
              ¡Cuenta creada! Te enviamos un correo para activar tu casilla antes de ingresar.
            </div>
          )}

          {errorMessage === "TermsRequired" && (
            <div className="rounded-xl bg-red-50 p-3 text-xs sm:text-sm text-red-600 border border-red-200">
              Tenés que aceptar los Términos y Condiciones para registrarte.
            </div>
          )}

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
          {errorMessage === "WeakPassword" && (
            <div className="rounded-xl bg-red-50 p-3 text-xs sm:text-sm text-red-600 border border-red-200">
              La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo.
            </div>
          )}
          {errorMessage === "ServerError" && (
            <div className="rounded-xl bg-red-50 p-3 text-xs sm:text-sm text-red-600 border border-red-200">
              Ocurrió un error en el servidor. Intentá nuevamente.
            </div>
          )}

          {/* method="post": si se envía antes de que cargue React, la contraseña no queda en la URL */}
          <form method="post" onSubmit={handleSubmit} className="space-y-4">
            {/* NOMBRE COMPLETO */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-[#00205B]">
                Nombre completo
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                className="bg-white/80 border-[#00205B]/20 focus-visible:ring-[#00205B]"
              />
            </div>

            {/* EMAIL */}
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

            {/* TIPO DE CUENTA */}
            <div className="space-y-1.5">
              <Label htmlFor="userType" className="text-xs font-semibold text-[#00205B]">
                Tipo de Cuenta
              </Label>
              <select
                id="userType"
                name="userType"
                defaultValue="PARTICULAR"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-md border border-[#00205B]/20 bg-white/80 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00205B] font-medium"
              >
                {USER_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CONTRASEÑA */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-[#00205B]">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
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
              <p className="text-[10px] text-[#00205B]/60">
                Mínimo 8 caracteres, al menos 1 mayúscula, 1 número y 1 símbolo.
              </p>
            </div>

            {/* MINI VENTANA DE TÉRMINOS Y CONDICIONES CON SCROLL */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#00205B] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#00205B]/70" />
                  Términos y Condiciones de Uso
                </Label>
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-[11px] text-[#D62828] hover:underline font-medium"
                >
                  Abrir página completa ↗
                </Link>
              </div>

              {/* Ventana con Scroll Interno */}
              <div className="h-32 w-full overflow-y-auto rounded-xl border border-[#00205B]/20 bg-slate-50/90 p-3 text-[11px] shadow-inner focus:outline-none focus:ring-1 focus:ring-[#00205B]">
                <TermsContent />
              </div>

              {/* CHECKBOX DE ACEPTACIÓN */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#00205B]/30 text-[#00205B] focus:ring-[#00205B] cursor-pointer"
                  required
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-[#00205B]/80 leading-snug cursor-pointer select-none"
                >
                  He leído y acepto los{" "}
                  <Link href="/terms" target="_blank" className="font-semibold text-[#00205B] underline">
                    Términos y Condiciones
                  </Link>{" "}
                  de Ventas Aeronáuticas.
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full mt-2 bg-[#D62828] hover:bg-[#c00d1a] text-white font-medium py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-xs sm:text-sm text-[#00205B]/70 pt-2 border-t border-[#00205B]/10">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="text-[#D62828] font-semibold hover:underline transition-colors"
            >
              Ingresá
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}