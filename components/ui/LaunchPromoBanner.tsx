"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { FREE_QUOTA_PROMO } from "@/lib/promo";
import { useViewerStatus } from "@/components/ui/FavoriteIdsProvider";

const STORAGE_KEY = "va_launch_promo";

type PromoState = { views: number; dismissed: boolean };

function readState(): PromoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PromoState>;
      return { views: Number(parsed.views) || 0, dismissed: !!parsed.dismissed };
    }
  } catch {
    // Sin localStorage (modo privado, bloqueado): se muestra igual, sin recordar.
  }
  return { views: 0, dismissed: false };
}

function writeState(state: PromoState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ídem: si no se puede guardar, no pasa nada.
  }
}

// Cartel de la Home para visitantes sin cuenta (VA-47; VA-152: cupo Gratis). Se ve como mucho FREE_QUOTA_PROMO.maxViews
// veces por navegador, o hasta que lo cierren. Nada de ventanas emergentes.
// VA-76: la Home es estática, así que "sin cuenta" se sabe en el navegador (FavoriteIdsProvider);
// solo cuenta una vista cuando se confirma que no hay sesión.
export function LaunchPromoBanner({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const viewer = useViewerStatus();

  useEffect(() => {
    if (viewer !== null && viewer !== "anonymous") return;
    const state = readState();
    if (state.dismissed || state.views >= FREE_QUOTA_PROMO.maxViews) return;
    writeState({ ...state, views: state.views + 1 });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el estado depende de localStorage, que solo existe en el navegador
    setVisible(true);
  }, [viewer]);

  if (!visible) return null;

  const dismiss = () => {
    writeState({ ...readState(), dismissed: true });
    setVisible(false);
  };

  return (
    <section aria-label={FREE_QUOTA_PROMO.title} className="container mx-auto px-4 pt-8">
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border-l-2 border-[#E70F1F] bg-[#001F58] px-5 py-5 pr-14 text-white">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[#FF5A64]">{FREE_QUOTA_PROMO.title}</p>
          <p className="text-lg sm:text-xl font-bold">{text}</p>
          <p className="mt-1 text-sm text-white/80">Creá tu cuenta y publicá en minutos.</p>
        </div>
        <Link
          href="/register"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#E70F1F] px-5 text-sm font-bold hover:bg-[#C20D1A] transition-colors"
        >
          Crear cuenta gratis
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
