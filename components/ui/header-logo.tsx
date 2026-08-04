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
          src="/logo-mark-red.png"
          alt="Ventas Aeronáuticas"
          width={48}
          height={48}
          priority
        />
      </div>
    </Link>
  );
}