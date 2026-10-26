"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// VA-92: mientras el webhook no confirma el pago, la página de estado se vuelve a pedir cada pocos
// segundos (solo lee la base: nunca activa nada desde acá). Deja de insistir a los 2 minutos.
export function AutoRefresh({ everyMs = 4000, maxMs = 120_000 }: { everyMs?: number; maxMs?: number }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > maxMs) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs, maxMs]);

  return gaveUp ? (
    <p className="mt-4 text-sm text-slate-600">
      Mercado Pago todavía no nos confirmó el pago. Podés cerrar esta página: cuando se acredite, la compra se activa sola y la
      ves en tu perfil.
    </p>
  ) : null;
}
