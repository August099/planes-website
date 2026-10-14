"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { LAUNCH_PROMO, isLaunchPromoActive } from "@/lib/promo";

const subscribeNothing = () => () => {};

// VA-111: aviso corto de la promoción de lanzamiento para páginas estáticas (registro, cómo publicar,
// planes). Se decide en el navegador para que se apague solo al llegar al corte, sin redeploy.
export function LaunchPromoNote({ className = "", showLink = false }: { className?: string; showLink?: boolean }) {
  const active = useSyncExternalStore(subscribeNothing, () => isLaunchPromoActive(), () => false);
  if (!active) return null;
  return (
    <p className={`border-l-2 border-[#E70F1F] pl-3 text-sm text-slate-700 ${className}`}>
      <span className="font-semibold text-[#001F58]">{LAUNCH_PROMO.text}.</span> {LAUNCH_PROMO.detail}
      {showLink && (
        <>
          {" "}
          <Link href="/register" className="font-semibold text-[#E70F1F] hover:underline">
            Crear cuenta
          </Link>
        </>
      )}
    </p>
  );
}
