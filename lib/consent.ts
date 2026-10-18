// VA-155: elección de cookies del visitante. "all" = necesarias + medición; "necessary" = solo las
// necesarias. Se guarda 1 año en la cookie va_consent (necesaria: recuerda la elección). Sin elección
// todavía, no se crea ninguna cookie de medición.
export const CONSENT_COOKIE = "va_consent";
export type Consent = "all" | "necessary";
export const CONSENT_EVENT = "va-consent-change";
export const OPEN_CONSENT_EVENT = "va-consent-open";
const YEAR = 60 * 60 * 24 * 365;

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1);
  return raw === "all" || raw === "necessary" ? raw : null;
}

export function writeConsent(value: Consent) {
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Abre el cartel de nuevo (link "Cookies" del footer). */
export function openConsentBanner() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
