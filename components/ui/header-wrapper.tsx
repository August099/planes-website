"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsHome } from "@/lib/use-is-home";

// Páginas donde el header NO aparece al scrollear hacia arriba
// (ahí ya existe la barra pegajosa de contacto)
const EXCLUDED_PATHS = [
  /^\/aircraft\/[^/]+\/?$/,                    // aircraft/[id]
  /^\/spareparts\/sparepart-details\/[^/]+\/?$/ // sparepart-details/[id]
];

export function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const isHome = useIsHome();
  const pathname = usePathname();
  const scrollUpEnabled =
    !isHome && !EXCLUDED_PATHS.some((re) => re.test(pathname));

  // Página en la que se ocultó al bajar: al cambiar de página vuelve a verse sola.
  const [hiddenOn, setHiddenOn] = useState<string | null>(null);
  const visible = hiddenOn !== pathname;

  useEffect(() => {
    if (!scrollUpEnabled) return;

    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setHiddenOn(null);              // arriba de todo: siempre visible
      else if (y < lastY) setHiddenOn(null);      // scroll hacia arriba: aparece
      else if (y > lastY) setHiddenOn(pathname);  // scroll hacia abajo: se oculta
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollUpEnabled, pathname]);

  const positionClass = isHome
    ? "absolute top-0 left-0 bg-transparent text-white"
    : scrollUpEnabled
      ? "sticky top-0 bg-white text-slate-800 shadow-sm transition-transform"
      : "relative bg-white text-slate-800 shadow-sm";

  return (
    <header
      data-home={isHome || undefined}
      className={`w-full z-40 duration-300 transition-colors ${positionClass} ${
        scrollUpEnabled && !visible ? "-translate-y-full" : ""
      }`}
    >
      {children}
    </header>
  );
}