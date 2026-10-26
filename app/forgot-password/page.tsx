import type { Metadata } from "next";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { requestPasswordResetAction } from "@/app/actions/password-reset-actions";

export const metadata: Metadata = {
  title: "Olvidé mi contraseña",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

const ERRORS: Record<string, string> = {
  email: "Ingresá un email válido.",
  rate: "Ya pediste un link hace instantes. Esperá un minuto y revisá también la carpeta de spam.",
  server: "No pudimos mandar el mail. Probá de nuevo en unos minutos.",
};

// VA-105 · 3: pide el link para restablecer la contraseña. La respuesta es la misma exista o no la
// cuenta (no revela qué emails están registrados).
export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { sent, error } = await searchParams;
  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] px-4 py-12">
      <PageBackground page="login" />
      <div className="mx-auto max-w-md rounded-lg border border-[#00205B]/10 bg-white p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tu cuenta</p>
        <h1 className="mt-1 text-2xl font-bold text-[#00205B]">Olvidé mi contraseña</h1>

        {sent ? (
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              Si el email está registrado, te mandamos un link para elegir una contraseña nueva. Vence en 1 hora y sirve
              una sola vez.
            </p>
            <p className="text-slate-500">¿No llega? Revisá la carpeta de spam o pedilo de nuevo en un minuto.</p>
            <Link href="/login" className="inline-block font-semibold text-[#00205B] hover:text-[#D62828] hover:underline">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form action={requestPasswordResetAction} className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">Ingresá el email de tu cuenta y te mandamos un link para elegir una nueva.</p>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-[#00205B]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="min-h-11 w-full rounded-md border border-[#00205B]/20 bg-white px-3 text-sm focus:border-[#00205B] focus:outline-none"
              />
            </div>
            {error && ERRORS[error] && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {ERRORS[error]}
              </p>
            )}
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#00205B] px-6 text-sm font-bold text-white transition-colors hover:bg-[#001331]"
            >
              Mandarme el link
            </button>
            <p className="text-center text-sm text-slate-600">
              <Link href="/login" className="font-semibold text-[#00205B] hover:text-[#D62828] hover:underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
