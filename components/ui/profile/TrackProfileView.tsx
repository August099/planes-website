"use client";

import { useEffect } from "react";
import { logProfileView } from "@/app/actions/analytics-actions";
import { ensureAnalyticsCookies } from "@/lib/analytics-client";

// VA-151: registra la visita al perfil una sola vez por pestaña (igual que TrackListingView).
export function TrackProfileView({ profileUserId }: { profileUserId: string }) {
  useEffect(() => {
    const key = `va_profile_view:${profileUserId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Sin sessionStorage: el servidor deduplica por usuario o visitante.
    }
    ensureAnalyticsCookies();
    void logProfileView(profileUserId);
  }, [profileUserId]);

  return null;
}
