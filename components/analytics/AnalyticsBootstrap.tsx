"use client";

import { useEffect } from "react";
import { ensureAnalyticsCookies } from "@/lib/analytics-client";

// Deja las cookies de visitante y origen en la primera página de la visita (VA-15).
export function AnalyticsBootstrap() {
  useEffect(() => {
    ensureAnalyticsCookies();
  }, []);
  return null;
}
