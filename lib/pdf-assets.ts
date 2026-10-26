import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { USER_TYPE_LABELS } from "@/lib/user-types";
import { hasCustomPage, hasVerifiedBadge } from "@/lib/subscriptions";

// VA-87 A: piezas de los PDF de avisos (logo, fotos comprimidas, QR y vendedor), armadas en el
// servidor. Las fotos se achican con sharp (viene con Next para su optimizador de imágenes) para
// que el PDF pese poco; @react-pdf/renderer no lee WebP, así que todo se pasa a JPEG.

const IMG_TIMEOUT_MS = 6000;

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    return null;
  }
}

/** Foto del aviso como JPEG comprimido en data URL; null si no se pudo bajar o convertir. */
export async function pdfPhoto(url: string | null | undefined, width: number, quality: number): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(IMG_TIMEOUT_MS) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const sharp = await loadSharp();
    if (!sharp) return null;
    const out = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

/** La principal grande y hasta 4 miniaturas. */
export async function pdfPhotos(urls: string[]) {
  const [main, ...thumbs] = await Promise.all([
    pdfPhoto(urls[0], 1100, 70),
    ...urls.slice(1, 5).map((u) => pdfPhoto(u, 360, 62)),
  ]);
  return { main, thumbs: thumbs.filter((t): t is string => !!t) };
}

let logoCache: string | null = null;
/** El mismo logo del header (logo-full-blue.png), en su orientación original. */
export async function pdfLogo(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const file = await readFile(path.join(process.cwd(), "public", "logo-full-blue.png"));
    logoCache = `data:image/png;base64,${file.toString("base64")}`;
    return logoCache;
  } catch {
    return null;
  }
}

/** URL pública y canónica del aviso, con los UTM del QR, y la versión corta para escribir. */
export function listingPdfUrls(kind: "aircraft" | "parts", id: string) {
  const pathname = kind === "aircraft" ? `/aircraft/${id}` : `/spareparts/sparepart-details/${id}`;
  const full = `${SITE_URL}${pathname}?utm_source=pdf&utm_medium=qr`;
  const short = `${SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}${pathname}`;
  return { full, short };
}

/** QR negro sobre blanco, con margen de silencio de 4 módulos (el que pide la norma). */
export async function pdfQr(url: string) {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 360,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/** Vendedor con los mismos datos que se ven en la web (nada que no sea público). */
export async function pdfSeller(sellerId: string) {
  const [user, custom, verified] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sellerId },
      select: { name: true, phone: true, email: true, city: true, province: true, userType: true, businessName: true, website: true, whatsapp: true },
    }),
    hasCustomPage(sellerId),
    hasVerifiedBadge(sellerId),
  ]);
  if (!user) return null;
  const contacts: { label: string; value: string }[] = [];
  if (user.phone) contacts.push({ label: "Teléfono", value: user.phone });
  if (user.email) contacts.push({ label: "Email", value: user.email });
  // La web y el WhatsApp propios solo se muestran en la página personalizada (VA-87).
  if (custom && user.whatsapp) contacts.push({ label: "WhatsApp", value: `+${user.whatsapp}` });
  if (custom && user.website) contacts.push({ label: "Web", value: user.website.replace(/^https?:\/\//, "").replace(/\/$/, "") });
  return {
    name: (custom && user.businessName) || user.name || "Vendedor",
    typeLabel: USER_TYPE_LABELS[user.userType],
    // "Cuenta verificada": solo con un plan que incluye la insignia (VA-105), igual que en la web.
    badges: verified ? ["Cuenta verificada"] : [],
    location: [user.city, user.province].filter(Boolean).join(", "),
    contacts,
  };
}
export type PdfSeller = NonNullable<Awaited<ReturnType<typeof pdfSeller>>>;
