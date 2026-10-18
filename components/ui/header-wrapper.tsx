"use client";

import { useIsHome } from "@/lib/use-is-home";

export function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const isHome = useIsHome();

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