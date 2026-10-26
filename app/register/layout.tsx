import type { Metadata } from "next";

// La página es un componente cliente: la metadata va en este layout.
export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Creá tu cuenta gratis en Ventas Aeronáuticas para publicar aviones y repuestos y contactar vendedores.",
  alternates: { canonical: "/register" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
