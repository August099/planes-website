import "server-only";
import { cookies, headers } from "next/headers";
import { ANON_COOKIE, SOURCE_COOKIE } from "@/lib/analytics-client";
import { CONSENT_COOKIE } from "@/lib/consent";

export type AnalyticsContext = {
  anonymousId: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** VA-171: provincia aproximada (código ISO 3166-2:AR, ej. "X" = Córdoba). Sin la IP. */
  region: string | null;
};

/** VA-171: provincia del encabezado de Vercel, solo para visitas desde la Argentina. No es una cookie ni identifica a nadie. */
async function regionFromHeaders(): Promise<string | null> {
  try {
    const h = await headers();
    if (h.get("x-vercel-ip-country") !== "AR") return null;
    const r = h.get("x-vercel-ip-country-region");
    return r && /^[A-Z]$/.test(r) ? r : null;
  } catch {
    return null;
  }
}

const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// Datos del visitante para AnalyticsEvent (VA-15): se leen de las cookies que deja
// lib/analytics-client.ts. Usar en server actions y route handlers (no en páginas estáticas).
export async function getAnalyticsContext(): Promise<AnalyticsContext> {
  const region = await regionFromHeaders();
  try {
    const jar = await cookies();
    // VA-155: sin "Aceptar" en el cartel de cookies no se usan las de medición (aunque hayan quedado).
    if (jar.get(CONSENT_COOKIE)?.value !== "all") {
      return { anonymousId: null, referrer: null, utmSource: null, utmMedium: null, utmCampaign: null, region };
    }
    const anon = clean(jar.get(ANON_COOKIE)?.value, 64);
    let src: { r?: unknown; s?: unknown; m?: unknown; c?: unknown } = {};
    const raw = jar.get(SOURCE_COOKIE)?.value;
    if (raw) {
      // Next puede entregar el valor ya decodificado o no, según el runtime: probar los dos.
      for (const candidate of [raw, (() => { try { return decodeURIComponent(raw); } catch { return ""; } })()]) {
        try {
          src = JSON.parse(candidate);
          break;
        } catch {
          src = {};
        }
      }
    }
    return {
      anonymousId: anon,
      referrer: clean(src.r, 300),
      utmSource: clean(src.s, 100),
      utmMedium: clean(src.m, 100),
      utmCampaign: clean(src.c, 100),
      region,
    };
  } catch {
    return { anonymousId: null, referrer: null, utmSource: null, utmMedium: null, utmCampaign: null, region };
  }
}
