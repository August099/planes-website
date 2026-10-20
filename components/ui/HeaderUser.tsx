"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { User, Menu } from "lucide-react";
import { getHeaderIndicators, type HeaderIndicators } from "@/app/actions/header-actions";
import { DESKTOP_TRIGGER_CLASS, MOBILE_TRIGGER_CLASS, PendingDot, type PartCategoryLink } from "@/components/ui/header-menu-shared";
import { isRepublishNoticeDismissed, REPUBLISH_NOTICE_EVENT } from "@/lib/republish-notice";

// Parte del header que depende del usuario (VA-71). Es un componente cliente: así el resto del
// header (y las páginas sin datos de usuario) pueden ser estáticas y cachearse en el CDN.
//
// VA-76: el menú desplegable (@base-ui, ~140 KB) ya no viaja con cada página. Se muestra un botón
// igual al real; el módulo se descarga al acercarse al botón (mouse, foco o toque) y al hacer
// clic se monta el menú ya abierto (components/ui/HeaderMenus.tsx).

const loadMenus = () => import("@/components/ui/HeaderMenus");
const prefetchMenus = () => {
  void loadMenus();
};

function DesktopShell({ hasUnanswered = false }: { hasUnanswered?: boolean }) {
  return (
    <span className={DESKTOP_TRIGGER_CLASS} aria-hidden>
      <User className="h-4 w-4" />
      {hasUnanswered && <PendingDot className="absolute -top-1 -right-1 h-3 w-3 border-2 border-white" />}
    </span>
  );
}

function MobileShell() {
  return (
    <span className={MOBILE_TRIGGER_CLASS} aria-hidden>
      <Menu className="h-6 w-6" />
    </span>
  );
}

const DesktopDropdown = dynamic(() => loadMenus().then((m) => m.DesktopDropdown), {
  ssr: false,
  loading: () => <DesktopShell />,
});
const MobileDropdown = dynamic(() => loadMenus().then((m) => m.MobileDropdown), {
  ssr: false,
  loading: () => <MobileShell />,
});

function useHeaderUser() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [indicators, setIndicators] = useState<HeaderIndicators | null>(null);
  const userId = session?.user?.id;

  // Se vuelven a pedir al navegar (por ejemplo, después de responder una pregunta).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getHeaderIndicators()
      .then((r) => {
        if (!cancelled) setIndicators(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, pathname]);

  // VA-167: el punto de republicaciones se apaga si el usuario cerró el cartel con ese mismo saldo.
  const [, setDismissTick] = useState(0);
  useEffect(() => {
    const onDismiss = () => setDismissTick((n) => n + 1);
    window.addEventListener(REPUBLISH_NOTICE_EVENT, onDismiss);
    return () => window.removeEventListener(REPUBLISH_NOTICE_EVENT, onDismiss);
  }, []);

  const ind = userId ? indicators : null;
  return {
    status,
    userId,
    isAdmin: !!ind?.isAdmin || !!session?.user?.isAdmin,
    hasUnanswered: !!ind?.hasUnanswered,
    hasRepublish: !!ind?.republishKey && !isRepublishNoticeDismissed(ind.republishKey),
  };
}

export function DesktopUserMenu() {
  const { status, userId, isAdmin, hasUnanswered, hasRepublish } = useHeaderUser();
  const [armed, setArmed] = useState(false);
  const dot = hasUnanswered || hasRepublish;

  // Mientras se resuelve la sesión: un lugar del mismo tamaño, sin saltos.
  if (status === "loading") return <div className="h-9 w-9 rounded-lg bg-slate-200/40" aria-hidden />;

  if (!userId) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 bg-[#E70F1F] hover:bg-red-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
      >
        <User className="h-4 w-4" />
        Ingresar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {armed ? (
        <DesktopDropdown userId={userId} isAdmin={isAdmin} hasUnanswered={hasUnanswered} hasRepublish={hasRepublish} />
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          onPointerEnter={prefetchMenus}
          onFocus={prefetchMenus}
          aria-haspopup="menu"
          aria-expanded={false}
          aria-label={dot ? "Menú de usuario (tenés novedades)" : "Menú de usuario"}
          className={DESKTOP_TRIGGER_CLASS}
        >
          <User className="h-4 w-4" />
          {dot && <PendingDot className="absolute -top-1 -right-1 h-3 w-3 border-2 border-white" />}
        </button>
      )}
    </div>
  );
}

export function MobileMenu({ partCategories = [] }: { partCategories?: PartCategoryLink[] }) {
  const { status, userId, isAdmin, hasUnanswered, hasRepublish } = useHeaderUser();
  const [armed, setArmed] = useState(false);
  const dot = hasUnanswered || hasRepublish;

  if (armed) {
    return (
      <MobileDropdown userId={userId} isAdmin={isAdmin} hasUnanswered={hasUnanswered} hasRepublish={hasRepublish} loading={status === "loading"} partCategories={partCategories} />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      onPointerEnter={prefetchMenus}
      onTouchStart={prefetchMenus}
      onFocus={prefetchMenus}
      aria-haspopup="menu"
      aria-expanded={false}
      aria-label={dot ? "Abrir menú (tenés novedades)" : "Abrir menú"}
      className={MOBILE_TRIGGER_CLASS}
    >
      <Menu className="h-6 w-6" />
      {dot && <PendingDot className="absolute top-1.5 right-1.5 h-2.5 w-2.5 border border-white" />}
    </button>
  );
}
