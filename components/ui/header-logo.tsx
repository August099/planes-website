"use client";

import Link from "next/link";
import Image from "next/image";
import { useIsHome } from "@/lib/use-is-home";

export function HeaderLogo() {
  const isHome = useIsHome();

  const fullLogoSrc = isHome ? "/logo-full-white.png" : "/logo-full-blue.png";

  return (
    <Link href="/" aria-label="Ventas Aeronáuticas, ir al inicio" className="flex items-center min-h-11">
      <div className="hidden md:block">
        <Image
          src={fullLogoSrc}
          alt="Ventas Aeronáuticas"
          width={220}
          height={52}
          priority
        />
      </div>
      {/* Celular (VA-40): "VA//" completo, blanco sobre el hero de la Home y en color en el resto.
          Antes era logo-mark.svg, que solo tiene las barras "//". Los PNG son borradores: si el socio
          manda la versión final, se reemplazan con el mismo nombre. Aspecto 1032×276 (≈ 3,74:1). */}
      <div className="block md:hidden">
        <Image
          src={isHome ? "/logo-va-white.png" : "/logo-va-color.png"}
          alt="Ventas Aeronáuticas"
          width={127}
          height={34}
          priority
          className="h-[34px] w-auto object-contain shrink-0"
        />
      </div>
    </Link>
  );
}