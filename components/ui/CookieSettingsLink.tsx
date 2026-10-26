"use client";

import { openConsentBanner } from "@/lib/consent";

// VA-155: link "Cookies" del footer: vuelve a abrir el cartel para cambiar la elección.
// VA-175: también en Ajustes, con otro texto.
export function CookieSettingsLink({ className = "", label = "Cookies" }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={openConsentBanner} className={`cursor-pointer text-left ${className}`}>
      {label}
    </button>
  );
}
