"use client";

import { openConsentBanner } from "@/lib/consent";

// VA-155: link "Cookies" del footer: vuelve a abrir el cartel para cambiar la elección.
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentBanner} className={`cursor-pointer text-left ${className}`}>
      Cookies
    </button>
  );
}
