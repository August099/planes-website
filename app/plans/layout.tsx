import type { Metadata } from "next";

// La parte interactiva es un componente cliente (PlansClient): la metadata va en este layout.
export const metadata: Metadata = {
  title: "Planes para publicar",
  description: "Planes para publicar aviones y repuestos en Ventas Aeronáuticas: para particulares, talleres, brokers y concesionarios.",
  alternates: { canonical: "/plans" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
