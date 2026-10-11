import "server-only";
import { pdf } from "@react-pdf/renderer";
import { getAircraftDetail, getSparePartDetail } from "@/lib/listing-data";
import { isListingActive } from "@/lib/listing-filters";
import { getCurrentUser } from "@/lib/auth-helpers";
import { formatPrice } from "@/lib/format";
import { listingPdfUrls, pdfLogo, pdfPhotos, pdfQr, pdfSeller } from "@/lib/pdf-assets";
import { aircraftPdfSections, sparePartPdfSections } from "@/lib/pdf-sections";
import { ListingPDF, type ListingPdfProps } from "@/components/pdf/ListingPDF";

// VA-87 A: arma el PDF de un aviso. Los avisos activos los puede bajar cualquiera; los que no
// están visibles (pausados, vencidos, vendidos), solo su dueño o un admin. El QR siempre lleva al
// aviso (si no está visible, el detalle muestra el cartel de "no disponible").

const AR_DATE = (d: Date) => d.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

async function canSee(listing: { status: string; listingExpiresAt: Date | null; sellerId: string }) {
  if (isListingActive(listing)) return { ok: true, inactive: false };
  const user = await getCurrentUser();
  const allowed = !!user && (user.id === listing.sellerId || !!user.isAdmin);
  return { ok: allowed, inactive: true };
}

function pdfResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      // Datos del vendedor y del aviso al momento: no se cachea en el CDN.
      "Cache-Control": "private, no-store",
    },
  });
}

async function render(props: ListingPdfProps) {
  const blob = await pdf(<ListingPDF {...props} />).toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

export async function aircraftPdfResponse(id: string) {
  const a = await getAircraftDetail(id);
  if (!a) return new Response("No encontrado", { status: 404 });
  const access = await canSee(a);
  if (!access.ok) return new Response("No encontrado", { status: 404 });

  const urls = listingPdfUrls("aircraft", a.id);
  const [logo, photos, seller, qr] = await Promise.all([
    pdfLogo(),
    pdfPhotos(a.images.map((i) => i.url)),
    pdfSeller(a.sellerId),
    pdfQr(urls.full),
  ]);
  const buffer = await render({
    logo,
    kindLabel: "Ficha técnica · Aeronave",
    reference: a.id.slice(-6).toUpperCase(),
    generatedAt: AR_DATE(new Date()),
    title: a.title,
    price: formatPrice(a.price, { fallback: "Precio a consultar" }),
    publishedAt: AR_DATE(a.createdAt),
    location: [a.city, a.province].filter(Boolean).join(", "),
    inactive: access.inactive,
    photos,
    seller,
    description: a.description?.trim() || null,
    sections: aircraftPdfSections(a),
    qr: { image: qr, shortUrl: urls.short },
  });
  return pdfResponse(buffer, `avion-${a.id.slice(-6)}.pdf`);
}

export async function sparePartPdfResponse(id: string) {
  const sp = await getSparePartDetail(id);
  if (!sp) return new Response("No encontrado", { status: 404 });
  const access = await canSee(sp);
  if (!access.ok) return new Response("No encontrado", { status: 404 });

  const urls = listingPdfUrls("parts", sp.id);
  const [logo, photos, seller, qr] = await Promise.all([
    pdfLogo(),
    pdfPhotos(sp.images.map((i) => i.url)),
    pdfSeller(sp.sellerId),
    pdfQr(urls.full),
  ]);
  const buffer = await render({
    logo,
    kindLabel: "Ficha técnica · Repuesto",
    reference: sp.id.slice(-6).toUpperCase(),
    generatedAt: AR_DATE(new Date()),
    title: sp.title,
    price: formatPrice(sp.price, { inPesos: sp.inPesos, fallback: "Precio a consultar" }),
    publishedAt: AR_DATE(sp.createdAt),
    location: [sp.city, sp.province].filter(Boolean).join(", "),
    inactive: access.inactive,
    photos,
    seller,
    description: sp.description?.trim() || null,
    sections: sparePartPdfSections(sp),
    qr: { image: qr, shortUrl: urls.short },
  });
  return pdfResponse(buffer, `repuesto-${sp.id.slice(-6)}.pdf`);
}
