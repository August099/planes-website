// Identificación de visitantes y origen del tráfico (VA-15), del lado del navegador.
// - va_anon: id anónimo persistente (1 año) para contar "visitantes únicos".
// - va_src: de dónde llegó en esta sesión (referrer externo y utm_*). Cookie de sesión: se fija en
//   la primera página de la visita y no se pisa al navegar dentro del sitio.
// El servidor las lee en lib/analytics-context.ts y las guarda en cada AnalyticsEvent.

export const ANON_COOKIE = "va_anon";
export const SOURCE_COOKIE = "va_src";

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds?: number) {
  const age = maxAgeSeconds ? `; max-age=${maxAgeSeconds}` : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; samesite=lax${age}`;
}

export function ensureAnalyticsCookies() {
  if (typeof document === "undefined") return;
  try {
    if (!readCookie(ANON_COOKIE)) {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      writeCookie(ANON_COOKIE, id, 60 * 60 * 24 * 365);
    }
    if (!readCookie(SOURCE_COOKIE)) {
      const params = new URLSearchParams(window.location.search);
      let referrer = "";
      try {
        // Solo referrers externos: navegar dentro del sitio no es una "fuente".
        if (document.referrer && new URL(document.referrer).host !== window.location.host) referrer = document.referrer;
      } catch {
        referrer = "";
      }
      const source = {
        r: referrer.slice(0, 300),
        s: (params.get("utm_source") ?? "").slice(0, 100),
        m: (params.get("utm_medium") ?? "").slice(0, 100),
        c: (params.get("utm_campaign") ?? "").slice(0, 100),
      };
      writeCookie(SOURCE_COOKIE, JSON.stringify(source));
    }
  } catch {
    // Cookies bloqueadas: los eventos se registran igual, sin visitante ni origen.
  }
}
