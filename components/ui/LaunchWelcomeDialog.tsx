"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  dismissLaunchWelcomeAction,
  getLaunchWelcomeAction,
  type LaunchWelcome,
} from "@/app/actions/launch-welcome-actions";

// Pantallas del flujo de cuenta y de pago: ahí no se interrumpe; la ventana sale en la próxima página.
const SKIP_PREFIXES = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password", "/onboarding", "/checkout", "/payment"];

// VA-111 / VA-135: ventana de bienvenida del lanzamiento. Aparece una sola vez, en la primera página
// que ve una cuenta recién registrada (email o Google) con el saldo de lanzamiento (VA-89). El
// servidor la marca como vista al mostrarla. Se consulta una vez por carga de la página.
export function LaunchWelcomeDialog() {
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const checked = useRef(false);
  const [welcome, setWelcome] = useState<LaunchWelcome>({ show: false });

  useEffect(() => {
    if (checked.current || SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;
    checked.current = true;
    getLaunchWelcomeAction()
      .then(setWelcome)
      .catch(() => {
        // Si falla, no se muestra nada: no es crítico.
      });
  }, [pathname]);

  useEffect(() => {
    const d = ref.current;
    if (welcome.show && d && !d.open) d.showModal();
  }, [welcome]);

  if (!welcome.show) return null;

  const close = (goTo?: string) => {
    ref.current?.close();
    setWelcome({ show: false });
    void dismissLaunchWelcomeAction();
    if (goTo) router.push(goTo);
  };

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="launch-welcome-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-[#001F58]/15 p-0 text-slate-800 backdrop:bg-[#001331]/60"
    >
      <div className="border-l-4 border-[#E70F1F] p-6 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Lanzamiento <span className="text-[#E70F1F]">{"//"}</span> Ventas Aeronáuticas
          </p>
          <h2 id="launch-welcome-title" className="mt-1 font-heading text-xl font-bold text-[#001F58]">
            Gracias por acompañarnos desde el inicio
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          Por apoyar a Ventas Aeronáuticas desde su lanzamiento, tu cuenta ya tiene publicaciones gratis. Se usan solas
          al publicar: no tenés que cargar ningún cupón ni pagar nada.
        </p>
        <dl className="divide-y divide-[#001F58]/10 rounded-lg border border-[#001F58]/12 bg-white text-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500">Aviso de avión</dt>
            <dd className="font-semibold tabular-nums text-[#001F58]">
              {welcome.aircraft} gratis
            </dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500">Aviso de repuesto</dt>
            <dd className="font-semibold tabular-nums text-[#001F58]">
              {welcome.spareParts} gratis
            </dd>
          </div>
        </dl>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => close()}
            className="min-h-11 rounded-md border border-[#001F58]/20 px-4 text-sm font-semibold text-[#001F58] hover:bg-slate-50 cursor-pointer"
          >
            Más tarde
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close("/publish")}
            className="min-h-11 rounded-md bg-[#E70F1F] px-5 text-sm font-bold text-white hover:bg-[#C20D1A] cursor-pointer"
          >
            Publicar mi avión
          </button>
        </div>
      </div>
    </dialog>
  );
}
