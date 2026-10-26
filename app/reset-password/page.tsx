import type { Metadata } from "next";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { resetPasswordAction } from "@/app/actions/password-reset-actions";
import { isResetTokenValid } from "@/lib/password-reset";
import { PASSWORD_RULES_TEXT } from "@/lib/password-rules";

export const metadata: Metadata = {
  title: "Elegí una contraseña nueva",
  robots: { index: false, follow: false },
  // El token va en la URL: que no se filtre a otros sitios.
  referrer: "no-referrer",
};

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

const ERRORS: Record<string, string> = {
  mismatch: "Las contraseñas no coinciden.",
  weak: `La contraseña no cumple los requisitos. ${PASSWORD_RULES_TEXT}`,
};

const INPUT = "min-h-11 w-full rounded-md border border-[#00205B]/20 bg-white px-3 text-sm focus:border-[#00205B] focus:outline-none";

// VA-105 · 3: elegir una contraseña nueva desde el link del mail. Al guardarla se cierran las
// sesiones abiertas y, si el email no estaba verificado, queda verificado.
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token = "", error } = await searchParams;
  const valid = error !== "invalid" && (await isResetTokenValid(token));

  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] px-4 py-12">
      <PageBackground page="login" />
      <div className="mx-auto max-w-md rounded-lg border border-[#00205B]/10 bg-white p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tu cuenta</p>
        <h1 className="mt-1 text-2xl font-bold text-[#00205B]">Elegí una contraseña nueva</h1>

        {!valid ? (
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>Este link venció o ya se usó. Los links sirven una sola vez y durante 1 hora.</p>
            <Link href="/forgot-password" className="inline-block font-semibold text-[#00205B] hover:text-[#D62828] hover:underline">
              Pedir un link nuevo
            </Link>
          </div>
        ) : (
          <form action={resetPasswordAction} className="mt-4 space-y-4">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm text-slate-600">{PASSWORD_RULES_TEXT}</p>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-[#00205B]">
                Contraseña nueva
              </label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm" className="text-xs font-semibold text-[#00205B]">
                Repetí la contraseña
              </label>
              <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
            </div>
            {error && ERRORS[error] && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {ERRORS[error]}
              </p>
            )}
            <p className="text-xs text-slate-500">Al guardarla se cierra la sesión en todos tus dispositivos.</p>
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#00205B] px-6 text-sm font-bold text-white transition-colors hover:bg-[#001331]"
            >
              Guardar contraseña
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
