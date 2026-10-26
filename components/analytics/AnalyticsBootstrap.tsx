"use client";

import { useEffect } from "react";
import { clearAnalyticsCookies, ensureAnalyticsCookies } from "@/lib/analytics-client";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

// Deja las cookies de visitante y origen en la primera página de la visita (VA-15), solo si el
// visitante aceptó las cookies de medición (VA-155). Si cambia a "Solo necesarias", se borran.
export function AnalyticsBootstrap() {
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
