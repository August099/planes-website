import type { Metadata } from "next";
import { Suspense } from "react";

import LoginForm from "../../components/ui/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Ingresá a tu cuenta de Ventas Aeronáuticas para publicar, guardar favoritos y responder consultas.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}