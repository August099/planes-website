"use client";

import { useRouter } from "next/navigation";

// VA-163: "Página anterior" del 404 y el 403. Vuelve a la página anterior del historial; si se entró
// directo (sin historial en esta pestaña), lleva al inicio.
export function BackOrHomeButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className={`cursor-pointer ${className}`}
    >
      Página anterior
    </button>
  );
}
