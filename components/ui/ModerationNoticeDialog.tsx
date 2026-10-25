"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { acknowledgeModerationNoticeAction, getModerationNoticeAction } from "@/app/actions/moderation-actions";
import type { OwnerNotice } from "@/lib/moderation";

// Pantallas del flujo de cuenta y de pago: ahí no se interrumpe; la ventana sale en la próxima página.
const SKIP_PREFIXES = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password", "/onboarding", "/checkout", "/payment", "/publish"];

const TITLE: Record<OwnerNotice["action"], string> = {
  PAUSE: "Pausamos uno de tus avisos",
  KEEP_PAUSED: "Tu aviso sigue pausado",
  REACTIVATE: "Revisamos tu aviso",
};

// VA-154: ventana para el dueño de un aviso moderado. Sale una vez por acción del admin (pausa,
// "se mantiene pausado" o reactivación) y vuelve en la próxima visita mientras no la cierre. Se pide
// una vez por carga de la página.
export function ModerationNoticeDialog() {
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const checked = useRef(false);
  const [notice, setNotice] = useState<OwnerNotice | null>(null);

  useEffect(() => {
    if (checked.current || SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;
    checked.current = true;
    getModerationNoticeAction()
      .then(setNotice)
      .catch(() => {
        // Si falla, no se muestra nada: vuelve a intentarlo en la próxima carga.
      });
  }, [pathname]);

  useEffect(() => {
    const d = ref.current;
    if (notice && d && !d.open) d.showModal();
  }, [notice]);

  if (!notice) return null;

  const close = (goTo?: string) => {
    ref.current?.close();
    void acknowledgeModerationNoticeAction(notice.actionId);
    setNotice(null);
    if (goTo) router.push(goTo);
  };

  const reactivated = notice.action === "REACTIVATE";
  const body = reactivated
    ? notice.listingStatus === "ACTIVE"
      ? "Ya está publicado de nuevo."
      : "Lo levantamos, pero quedó pausado porque no te queda cupo: activalo desde tu perfil cuando tengas lugar."
    : "No se ve en el sitio. Editalo y, cuando esté corregido, tocá “Pedir revisión” en Mis publicaciones.";

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="moderation-notice-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-[#00205B]/15 p-0 text-slate-800 backdrop:bg-[#001331]/60"
    >
      <div className={`space-y-4 border-l-2 p-6 ${reactivated ? "border-[#00205B]" : "border-[#D62828]"}`}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Moderación <span className="text-[#D62828]">{"//"}</span> Ventas Aeronáuticas
          </p>
          <h2 id="moderation-notice-title" className="mt-1 font-heading text-xl font-bold text-[#00205B]">
            {TITLE[notice.action]}
          </h2>
        </div>
        <p className="text-sm font-semibold text-[#00205B]">“{notice.listingTitle}”</p>
        <p className="text-sm text-slate-600">{body}</p>
        {notice.message && (
          <p className="border-l-2 border-[#00205B]/30 pl-3 text-sm text-slate-700">
            <span className="font-semibold text-[#00205B]">{notice.action === "PAUSE" ? "Motivo" : "Mensaje"}:</span> {notice.message}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => close()}
            className="min-h-11 rounded-md border border-[#00205B]/20 px-4 text-sm font-semibold text-[#00205B] hover:bg-slate-50 cursor-pointer"
          >
            Entendido
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close(reactivated ? notice.listingHref : notice.editHref)}
            className="min-h-11 rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#001331] cursor-pointer"
          >
            {reactivated ? "Ver aviso" : "Editar aviso"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
