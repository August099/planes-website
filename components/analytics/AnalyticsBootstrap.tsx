"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logPageView } from "@/app/actions/analytics-actions";
import { clearAnalyticsCookies, ensureAnalyticsCookies } from "@/lib/analytics-client";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

// Deja las cookies de visitante y origen en la primera página de la visita (VA-15), solo si el
// visitante aceptó las cookies de medición (VA-155). Si cambia a "Solo necesarias", se borran.
export function AnalyticsBootstrap() {
  const pathname = usePathname();

  // 27/10: visita a cada página (una vez por página y pestaña; la marca va antes de llamar, así el doble
  // efecto de StrictMode no duplica). El panel admin no cuenta.
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const key = `va_pv:${pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Sin sessionStorage: se registra igual.
    }
    if (readConsent() === "all") ensureAnalyticsCookies();
    void logPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    const apply = () => {
      const consent = readConsent();
      if (consent === "all") ensureAnalyticsCookies();
      else if (consent === "necessary") clearAnalyticsCookies();
    };
    apply();
    window.addEventListener(CONSENT_EVENT, apply);
    return () => window.removeEventListener(CONSENT_EVENT, apply);
  }, []);
  return null;
}
