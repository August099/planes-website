import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";
import { auth } from "@/lib/auth";
import { getHangarDetail, type HangarDetail } from "@/lib/listing-data";
import { isListingActive } from "@/lib/listing-filters";
import type { DetailSection } from "@/lib/listing-detail";
import {
  AIRCRAFT_TYPE_LABELS,
  HANGARS_PATH,
  RENTAL_TYPE_LABELS,
  SERVICE_LABELS,
  SPACE_TYPE_LABELS,
  doorText,
  hangarPath,
  hangarPrices,
  meters,
  offerLabel,
} from "@/lib/hangars";
import { AircraftGallery } from "@/components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { InactiveListingNotice } from "@/components/ui/listing/InactiveListingNotice";
import { DetailSections } from "@/components/ui/listing/DetailSections";
import { PublishedLine } from "@/components/ui/listing/PublishedLine";
import { KeyFacts, type KeyFact } from "@/components/ui/listing/KeyFacts";
import { ListingDescription } from "@/components/ui/listing/ListingDescription";
import { SellerContactCard } from "@/components/ui/listing/SellerContactCard";
import { ListingLocationMap } from "@/components/ui/ListingLocationMap";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Props = { params: Promise<{ id: string }> };

const DATE = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function availability(h: HangarDetail) {
  if (!h.availableFrom || h.availableFrom <= new Date()) return "Disponible ahora";
  return `Desde el ${DATE.format(h.availableFrom)}`;
}

function seoDescription(h: HangarDetail) {
  const prices = hangarPrices(h);
  const price = prices.secondary
    ? `${prices.main.amount} · Alquiler ${prices.secondary.amount} ${prices.secondary.period}`.trim()
    : `${prices.main.amount} ${prices.main.suffix}`.trim();
  return `${offerLabel(h)} en ${h.airfieldName}, ${h.city}, ${h.province}. ${doorText(h.doorWidth, h.doorHeight)}. ${price}.`;
}

// Ficha: medidas, capacidad y ubicación, sin filas vacías (igual que lib/listing-detail.ts).
function hangarSections(h: HangarDetail): DetailSection[] {
  const sections: DetailSection[] = [
    {
      title: "Medidas",
      rows: [
        { label: "Puerta (ancho × alto)", value: `${meters(h.doorWidth)} × ${meters(h.doorHeight)}` },
        { label: "Ancho interior", value: meters(h.interiorWidth) ?? undefined },
        { label: "Fondo interior", value: meters(h.interiorDepth) ?? undefined },
        { label: "Superficie total", value: h.area != null ? `${meters(h.area)}²` : undefined },
      ],
    },
    {
      title: "Capacidad",
      rows: [
        { label: "Tipo de espacio", value: h.spaceType ? SPACE_TYPE_LABELS[h.spaceType] : undefined },
        { label: "Lugares disponibles", value: h.spots != null ? String(h.spots) : undefined },
        { label: "Tipos de aeronave", list: h.aircraftTypes.length > 0 ? h.aircraftTypes.map((t) => AIRCRAFT_TYPE_LABELS[t]) : undefined },
      ],
    },
    {
      title: "Ubicación",
      rows: [
        { label: "Aeródromo o pista", value: h.airfieldName },
        { label: "Código OACI/ANAC", value: h.icaoCode ?? undefined },
        { label: "Localidad", value: `${h.city}, ${h.province}` },
      ],
    },
  ];
  return sections
    .map((s) => ({ ...s, rows: s.rows.filter((r) => r.value || r.list) }))
    .filter((s) => s.rows.length > 0);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const hangar = await getHangarDetail(id);
  if (!hangar) notFound();
  const url = hangarPath(hangar.id);
  const title = `${hangar.title} · ${hangar.airfieldName}`;
  const description = seoDescription(hangar);
  const cover = hangar.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: isListingActive(hangar) ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, type: "website", ...(cover ? { images: [{ url: cover, alt: hangar.title }] } : {}) },
  };
}

// VA-84: detalle de hangar, con el mismo esqueleto que el de aeronave (fotos, resumen, vendedor,
// mapa, descripción y ficha). Preguntas, favoritos, denuncias y PDF se suman con la integración.
export default async function HangarDetailPage({ params }: Props) {
  const { id } = await params;
  const [session, hangar] = await Promise.all([auth(), getHangarDetail(id)]);
  if (!hangar) notFound();

  const isOwner = session?.user?.id === hangar.sellerId;
  const isInactive = !isListingActive(hangar);
  if (isInactive && !isOwner) {
    return <InactiveListingNotice backHref={HANGARS_PATH} backLabel="Ver otros hangares" background="default" />;
  }

  const seller = hangar.seller;
  const subject = encodeURIComponent(`Consulta por hangar ${hangar.title}`);
  const body = encodeURIComponent(`Hola, me interesa el hangar "${hangar.title}" publicado en Ventas Aeronáuticas.`);
  const emailUrl = seller.email ? `mailto:${seller.email}?subject=${subject}&body=${body}` : null;
  const cleanPhone = seller.phone ? seller.phone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${body}` : null;

  const prices = hangarPrices(hangar);
  const location = `${hangar.city}, ${hangar.province}`;
  const keyFacts: KeyFact[] = [
    { label: "Alquila", value: hangar.offersRent && hangar.rentalType ? RENTAL_TYPE_LABELS[hangar.rentalType] : null },
    { label: "Tipo de espacio", value: hangar.spaceType ? SPACE_TYPE_LABELS[hangar.spaceType] : null },
    { label: "Puerta", value: `${meters(hangar.doorWidth)} × ${meters(hangar.doorHeight)}` },
    { label: "Aeródromo", value: hangar.icaoCode ? `${hangar.airfieldName} (${hangar.icaoCode})` : hangar.airfieldName },
    { label: "Disponibilidad", value: availability(hangar) },
    { label: "Superficie", value: hangar.area != null ? `${meters(hangar.area)}²` : null },
    { label: "Lugares", value: hangar.spots != null ? String(hangar.spots) : null },
  ];

  return (
    <>
      {isInactive && isOwner && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-3 px-4 text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Tu publicación está pausada o vencida y no es visible para el público.</span>
          <Link href={`/profile/${hangar.sellerId}`} className="underline font-bold hover:text-amber-100 ml-2">
            Ir a mi perfil
          </Link>
        </div>
      )}

      {/* Misma disposición que el detalle de aeronave (VA-41): en celular, fotos → resumen →
          vendedor → mapa → descripción → servicios y ficha; desde lg, dos columnas. */}
      <main className="container flex flex-col gap-10 mx-auto px-4 py-8">
        <PageBackground page="default" />
        <Breadcrumbs
          items={[{ label: "Servicios", href: "/services" }, { label: "Hangares", href: HANGARS_PATH }, { label: hangar.title }]}
          jsonLd={false}
          className="-mt-4 -mb-6"
        />
        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          <div className="contents lg:flex lg:w-2/3 lg:flex-col lg:gap-8">
            <div className="order-1 lg:order-none">
              <AircraftGallery images={hangar.images} title={hangar.title} />
            </div>

            <div className="order-4 lg:order-none border border-slate-200 rounded-2xl bg-white p-6 shadow-sm">
              <ListingDescription text={hangar.description} />
            </div>

            <div className="order-5 lg:order-none flex flex-col gap-5 lg:gap-8">
              {hangar.services.length > 0 && (
                <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold text-[#001F58]">Servicios</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-slate-700">
                    {hangar.services.map((s) => (
                      <li key={s} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                        {SERVICE_LABELS[s]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <DetailSections sections={hangarSections(hangar)} />
            </div>
          </div>

          <div className="contents lg:flex lg:w-1/3 lg:flex-col lg:gap-5">
            <div className="order-2 lg:order-none border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <PublishedLine createdAt={hangar.createdAt} location={location} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{offerLabel(hangar)}</p>
                <h1 className="mt-1 text-xl font-bold text-[#001F58]">{hangar.title}</h1>
                <p className="text-[var(--sidebar-primary)] text-2xl font-black mt-2 tabular-nums">
                  {prices.secondary ? <span className="sr-only">Venta: </span> : null}
                  {prices.main.amount}
                  {prices.main.suffix && <span className="ml-1.5 text-sm font-semibold text-slate-500">{prices.main.suffix}</span>}
                </p>
                {prices.secondary && (
                  <p className="mt-1 text-sm font-semibold text-slate-700 tabular-nums">
                    {prices.secondary.label}: {prices.secondary.amount}
                    {prices.secondary.period && <span className="font-normal text-slate-500"> {prices.secondary.period}</span>}
                  </p>
                )}
                {hangar.negotiable && <p className="mt-1 text-xs font-medium text-slate-500">Precio negociable</p>}
              </div>
              <Separator />
              <KeyFacts title="Datos del hangar" facts={keyFacts} />
            </div>

            <SellerContactCard
              className="order-3 lg:order-none"
              seller={seller}
              whatsappUrl={whatsappUrl}
              emailUrl={emailUrl}
              entityId={hangar.id}
              entityType="HANGAR"
            />

            <ListingLocationMap
              className="order-3 lg:order-none"
              latitude={hangar.latitude}
              longitude={hangar.longitude}
              city={hangar.city}
              province={hangar.province}
            />
          </div>
        </section>
      </main>
    </>
  );
}
