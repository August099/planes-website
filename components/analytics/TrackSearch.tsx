"use client";

import { useEffect } from "react";
import { logSearch } from "@/app/actions/analytics-actions";
import { ensureAnalyticsCookies } from "@/lib/analytics-client";

// Registra la búsqueda de /search una vez por pestaña y término (VA-15): recargar o volver atrás
// no la duplica.
export function TrackSearch({ query, resultsCount }: { query: string; resultsCount: number }) {
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return;
    const key = `va_search:${q}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Sin sessionStorage se registra igual.
    }
    ensureAnalyticsCookies();
    void logSearch(q, resultsCount, "SEARCH_PAGE");
  }, [query, resultsCount]);

  return null;
}
