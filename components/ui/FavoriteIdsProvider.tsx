"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getMyFavoriteIds } from "@/app/actions/favorite-actions";

type FavoriteIds = { aircraft: string[]; spareParts: string[] };
type ViewerState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "user"; favorites: FavoriteIds };

const ViewerContext = createContext<ViewerState | null>(null);

// VA-76: la Home es estática (se sirve desde el CDN), así que no sabe quién la mira. Con un solo
// pedido desde el navegador se sabe si hay sesión y cuáles son sus favoritos; las cards los marcan
// cuando llegan y el cartel de lanzamiento se muestra solo a visitantes sin cuenta.
export function FavoriteIdsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getMyFavoriteIds()
      .then((res) => {
        if (!cancelled) setState(res ? { status: "user", favorites: res } : { status: "anonymous" });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <ViewerContext.Provider value={state}>{children}</ViewerContext.Provider>;
}

/** Favoritos del usuario si la página usa FavoriteIdsProvider y hay sesión; si no, null. */
export function useFavoriteIds(): FavoriteIds | null {
  const state = useContext(ViewerContext);
  return state?.status === "user" ? state.favorites : null;
}

/** "loading" | "anonymous" | "user", o null fuera de FavoriteIdsProvider. */
export function useViewerStatus() {
  return useContext(ViewerContext)?.status ?? null;
}
