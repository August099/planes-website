"use client";

import { usePathname } from "next/navigation";

export function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header
      className={`w-full z-40 transition-colors duration-300 ${
        isHome
          ? "absolute top-0 left-0 bg-transparent text-white"
          : "relative bg-white text-slate-800 shadow-sm"
      }`}
    >
      {children}
    </header>
  );
}