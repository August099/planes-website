"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function HeaderLogo() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const fullLogoSrc = isHome ? "/logo-full-white.png" : "/logo-full.png";

  return (
    <Link href="/" className="flex items-center">
      <div className="hidden md:block">
        <Image
          src={fullLogoSrc}
          alt="Ventas Aeronáuticas"
          width={220}
          height={52}
          priority
        />
      </div>
      <div className="block md:hidden">
        <Image
          src="/logo-mark.svg"
          alt="Ventas Aeronáuticas Icono"
          width={20}
          height={20}
          priority
          className="block md:hidden h-9 w-auto object-contain shrink-0"
        />
      </div>
    </Link>
  );
}