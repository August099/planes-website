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

  // Rediseño moderno (26/10): tarjeta roja redondeada que flota sobre el borde del hero, con las "//"
  // de la marca como franjas diagonales que se desplazan lento.
  return (
    <section aria-label={FREE_QUOTA_PROMO.title} className="relative z-30 container mx-auto -mt-10 px-4 sm:-mt-14">
      <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#D62828_0%,#B71F1F_100%)] px-6 py-6 pr-16 text-white shadow-[0_24px_48px_-20px_rgb(183_31_31/0.6)] sm:flex-row sm:items-center sm:gap-8 sm:px-8">
        {/* Las franjas van en su propia capa: .va-stripes usa background-image y taparía el degradé rojo. */}
        <span aria-hidden className="va-stripes absolute inset-0 -z-10" />
        <p className="shrink-0 self-start rounded-full bg-[#00205B] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] sm:self-center">
          {FREE_QUOTA_PROMO.title}
        </p>
        <div className="flex-1">
          <p className="font-heading text-xl leading-tight font-extrabold tracking-[-0.02em] sm:text-2xl">{text}</p>
          <p className="mt-1 text-sm text-white">Creá tu cuenta y publicá en minutos.</p>
        </div>
        <Link
          href="/register"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-[#B71F1F] shadow-sm transition-transform hover:scale-[1.03]"
        >
          Crear cuenta gratis
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
