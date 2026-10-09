// Datos del sitio que usan la metadata, robots, sitemap y el JSON-LD.
// NEXT_PUBLIC_SITE_URL tiene que ser el dominio canónico (sin "/" final).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ventasaeronauticas.com").replace(/\/+$/, "");

export const SITE_NAME = "Ventas Aeronáuticas";

export const SITE_DESCRIPTION =
  "Comprá y vendé aviones, helicópteros y repuestos aeronáuticos en Argentina. Publicá tu aviso y contactá directo con el vendedor.";

// Teléfono de contacto del sitio (VA-50, D10): footer y JSON-LD de la organización.
export const CONTACT_PHONE = { display: "+54 9 3456 44-5758", e164: "+5493456445758" };

export const BRAND_COLORS = {
  blue: "#001F58",
  red: "#E70F1F",
};

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
