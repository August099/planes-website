import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { consumeVerificationToken } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Activar cuenta",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string }> };

// Link del mail de verificación (VA-20): valida el token, marca el email como verificado y
// manda al login con el aviso de éxito. Si el link no sirve, explica cómo pedir otro.
export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const result = token ? await consumeVerificationToken(token) : "invalid";

  if (result === "ok") redirect("/login?success=EmailVerified");

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-6">
      <h1 className="text-2xl font-bold text-[#001F58]">
        {result === "expired" ? "El link de activación venció" : "El link de activación no es válido"}
      </h1>
      <p className="text-sm text-slate-600 max-w-md">
        {result === "expired"
          ? "Los links duran 24 horas. Pedí uno nuevo desde Iniciar sesión, con \"Reenviar mail de verificación\"."
          : "Puede que ya lo hayas usado o que esté incompleto. Si tu cuenta todavía no está activa, pedí un link nuevo desde Iniciar sesión."}
      </p>
      <Link href="/login" className="px-6 py-2.5 bg-[#001F58] text-white rounded-xl font-semibold">
        Ir a Iniciar sesión
      </Link>
    </main>
  );
}
