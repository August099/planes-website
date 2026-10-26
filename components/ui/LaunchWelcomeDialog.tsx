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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-[#00205B]/15 p-0 text-slate-800 backdrop:bg-[#001331]/60"
    >
      <div className="border-l-2 border-[#D62828] p-6 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Bienvenida <span className="text-[#D62828]">{"//"}</span> Ventas Aeronáuticas
          </p>
          <h2 id="launch-welcome-title" className="mt-1 font-heading text-xl font-bold text-[#00205B]">
            Tu cuenta ya está lista
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          {welcome.text} Tus avisos quedan publicados hasta que los pauses o los marques como vendidos. Si necesitás
          publicar más, mirá los planes.
        </p>
        <dl className="divide-y divide-[#00205B]/10 rounded-lg border border-[#00205B]/12 bg-white text-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500">Aviones activos</dt>
            <dd className="font-semibold tabular-nums text-[#00205B]">
              {welcome.aircraft ?? "Ilimitados"}
            </dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-slate-500">Repuestos activos</dt>
            <dd className="font-semibold tabular-nums text-[#00205B]">
              {welcome.spareParts ?? "Ilimitados"}
            </dd>
          </div>
        </dl>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => close()}
            className="min-h-11 rounded-md border border-[#00205B]/20 px-4 text-sm font-semibold text-[#00205B] hover:bg-slate-50 cursor-pointer"
          >
            Más tarde
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close("/publish")}
            className="min-h-11 rounded-md bg-[#D62828] px-5 text-sm font-bold text-white hover:bg-[#B71F1F] cursor-pointer"
          >
            Publicar mi avión
          </button>
        </div>
      </div>
    </dialog>
  );
}
