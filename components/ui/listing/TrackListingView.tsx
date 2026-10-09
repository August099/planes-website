"use client";

import { useEffect } from "react";
import { logListingView } from "@/app/actions/analytics-actions";
import { ensureAnalyticsCookies } from "@/lib/analytics-client";

// Registra la vista del detalle una sola vez por pestaña y publicación (VA-17).
// La marca en sessionStorage va antes de llamar, así el doble efecto de StrictMode no duplica.
export function TrackListingView({ type, id }: { type: "AIRCRAFT" | "SPARE_PART"; id: string }) {
  useEffect(() => {
    const key = `va_view:${type}:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Sin sessionStorage (modo privado estricto): se registra igual; el servidor deduplica por usuario.
    }
    ensureAnalyticsCookies();
    void logListingView(type, id);
  }, [type, id]);

  return null;
}
