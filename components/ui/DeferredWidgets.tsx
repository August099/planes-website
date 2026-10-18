"use client";

import dynamic from "next/dynamic";

// Rendimiento (VA-76): la bandeja del comparador y la bienvenida del lanzamiento no se ven al cargar
// (arrancan vacías y aparecen después), así que su código baja aparte y no suma a la hidratación de
// la página. ssr: false solo se puede usar desde un componente de cliente, por eso este envoltorio.
const CompareTray = dynamic(() => import("@/components/ui/compare/CompareTray").then((m) => m.CompareTray), {
  ssr: false,
});
const LaunchWelcomeDialog = dynamic(
  () => import("@/components/ui/LaunchWelcomeDialog").then((m) => m.LaunchWelcomeDialog),
  { ssr: false }
);

export function DeferredWidgets() {
  return (
    <>
      {/* VA-83: bandeja de comparación de aeronaves (aparece al agregar la primera) */}
      <CompareTray />
      {/* VA-111: bienvenida del lanzamiento (una vez por cuenta, con el saldo gratis de VA-89) */}
      <LaunchWelcomeDialog />
    </>
  );
}
