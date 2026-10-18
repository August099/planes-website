"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { OPEN_CONSENT_EVENT, readConsent, writeConsent, type Consent } from "@/lib/consent";

// VA-155: cartel chico de cookies, fijo abajo. Sale hasta que el visitante elige ("Aceptar" o "Solo
// necesarias", se guarda 1 año) y vuelve con el link "Cookies" del footer. Mientras se ve, publica su
// alto en --va-consent-h: la bandeja del comparador sube y el pie de la página no queda tapado. El
// panel de filtros del celular (modal, más arriba en z-index) lo cubre, así "Aplicar filtros" se ve.
export function CookieBanner() {
  // Se monta solo en el navegador (ssr: false en DeferredWidgets): la cookie se lee al iniciar.
  const [current, setCurrent] = useState<Consent | null>(() => readConsent());
  const [open, setOpen] = useState(() => !readConsent());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reopen = () => {
      setCurrent(readConsent());
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!open || !el) {
      root.style.removeProperty("--va-consent-h");
      return;
    }
    const sync = () => root.style.setProperty("--va-consent-h", `${el.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--va-consent-h");
    };
  }, [open]);

  if (!open) return null;

  const choose = (value: Consent) => {
    writeConsent(value);
    setCurrent(value);
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#001F58]/15 bg-white shadow-[0_-4px_16px_rgba(0,31,88,0.08)] print:hidden"
    >
      <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">
          Usamos cookies necesarias para que el sitio funcione y, si aceptás, cookies de medición para mejorarlo.{" "}
          <Link href="/privacy#cookies" className="font-semibold text-[#001F58] underline underline-offset-2">
            Privacidad
          </Link>
          {current && (
            <span className="text-slate-500"> · Elegiste: {current === "all" ? "todas" : "solo necesarias"}.</span>
          )}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("necessary")}
            className="min-h-10 flex-1 rounded-md border border-[#001F58]/25 px-4 text-sm font-semibold text-[#001F58] hover:bg-[#001F58]/5 cursor-pointer sm:flex-none"
          >
            Solo necesarias
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className="min-h-10 flex-1 rounded-md bg-[#001F58] px-5 text-sm font-bold text-white hover:bg-[#00133A] cursor-pointer sm:flex-none"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
