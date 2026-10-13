import type { Metadata } from "next";

import LoginForm from "../../components/ui/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Ingresá a tu cuenta de Ventas Aeronáuticas para publicar, guardar favoritos y responder consultas.",
  alternates: { canonical: "/login" },
};

type Props = { searchParams: Promise<{ error?: string; success?: string; callbackUrl?: string }> };

// Los parámetros se leen acá (servidor) y se pasan al formulario: con useSearchParams +
// <Suspense> el formulario no hidrataba y el login con contraseña no funcionaba (VA-20).
export default async function LoginPage({ searchParams }: Props) {
  const { error, success, callbackUrl } = await searchParams;
  return <LoginForm errorParam={error ?? null} successParam={success ?? null} callbackParam={callbackUrl ?? null} />;
}
