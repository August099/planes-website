import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "@/components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { FileText, AlertTriangle } from "lucide-react";
import { QnaSection } from "@/components/ui/QnaSection";
import { AircraftActionsHeader } from "@/components/ui/AircraftActionsHeader";
import { auth } from "@/lib/auth";
import Link from "next/link";
import type { Metadata } from "next";
import { getAircraftDetail } from "@/lib/listing-data";
import { isListingActive } from "@/lib/listing-filters";
import { aircraftSeoDescription, aircraftSeoTitle } from "@/lib/listing-seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { InactiveListingNotice } from "@/components/ui/listing/InactiveListingNotice";
import { TrackListingView } from "@/components/ui/listing/TrackListingView";
import { FeaturesCard } from "@/components/ui/listing/FeaturesCard";
import { DetailSections, PrintSections } from "@/components/ui/listing/DetailSections";
import { PublishedLine } from "@/components/ui/listing/PublishedLine";
import { aircraftFeatures, aircraftSections, showsEngineSummary } from "@/lib/listing-detail";
import { AIRCRAFT_FIELDS } from "@/lib/aircraft-fields";
import { CategoryLinks } from "@/components/ui/listing/CategoryLinks";
import { KeyFacts, type KeyFact } from "@/components/ui/listing/KeyFacts";
import { DescriptionBody, ListingDescription } from "@/components/ui/listing/ListingDescription";
import { SellerContactCard } from "@/components/ui/listing/SellerContactCard";
import { ListingLocationMap } from "@/components/ui/ListingLocationMap";
import { RecommendationRail } from "@/components/ui/recommendations/RecommendationRail";
import { getPartsForAircraft, getSimilarAircraft } from "@/lib/recommendations";
import { aircraftJsonLd } from "@/lib/structured-data";
import { formatPrice } from "@/lib/format";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { OwnerRepublishBar } from "@/components/ui/listing/OwnerRepublishBar";
import { BrokerDetailHeader } from "@/components/ui/listing/BrokerDetailHeader";
import { getBrokerDetail } from "@/lib/broker-detail";
import { youtubeId } from "@/lib/youtube";
import { getMoreFromSeller } from "@/lib/recommendations";
import { getRepublishStatus, republishView } from "@/lib/republish";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const aircraft = await getAircraftDetail(id);
  if (!aircraft) notFound();

  const title = aircraftSeoTitle(aircraft);
  const description = aircraftSeoDescription(aircraft);
  const url = `/aircraft/${aircraft.id}`;
  const cover = aircraft.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: isListingActive(aircraft) ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(cover ? { images: [{ url: cover, alt: aircraft.title }] } : {}),
    },
  };
}

export default async function AircraftDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, aircraft] = await Promise.all([auth(), getAircraftDetail(id)]);

  if (!aircraft) notFound();

  const isOwner = session?.user?.id === aircraft.sellerId;
  const isInactive = !isListingActive(aircraft);

  if (isInactive && !isOwner) {
    return <InactiveListingNotice backHref="/aircraft" backLabel="Ver otros aviones" background="aircraftDetail" />;
  }

  const seller = aircraft.seller;

  let isFavoriteInitial = false;
  if (session?.user?.id) {
    const fav = await prisma.favorite.findFirst({
      where: {
        userId: session.user.id,
        aircraftId: aircraft.id,
      },
      select: { id: true },
    });
    isFavoriteInitial = Boolean(fav);
  }

  const subject = encodeURIComponent(`Consulta por avión ${aircraft.title}`);
  const body = encodeURIComponent(
    `Hola, estoy interesado en el avión "${aircraft.title}" publicado en Ventas Aeronáuticas.`
  );

  const emailUrl = seller.email ? `mailto:${seller.email}?subject=${subject}&body=${body}` : null;
  const cleanPhone = seller.phone ? seller.phone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${body}` : null;

  const singleEngine = showsEngineSummary(aircraft) ? aircraft.engines[0] : null;
  const formattedPrice = formatPrice(aircraft.price);
  const tboText = (tbo: number | null) => (tbo != null ? `${tbo} hs` : "No informado");

  const features = aircraftFeatures(aircraft);
  const broker = await getBrokerDetail(aircraft.sellerId);
  const moreFromSeller = broker ? await getMoreFromSeller(aircraft.sellerId, aircraft.id, broker.name) : null;

  const [similar, parts] = await Promise.all([
    getSimilarAircraft({
      id: aircraft.id,
      categoryId: aircraft.categoryId,
      brandId: aircraft.brandId,
      modelId: aircraft.modelId,
      price: aircraft.price == null ? null : Number(aircraft.price),
      year: aircraft.year,
      province: aircraft.province,
    }),
    getPartsForAircraft({ id: aircraft.id, brandName: aircraft.brand?.name ?? null, modelName: aircraft.model?.name ?? null }),
  ]);

  const sections = aircraftSections(aircraft, { omitSummary: true });
  const printSections = aircraftSections(aircraft);
  const listingLocation = [aircraft.city, aircraft.province].filter(Boolean).join(", ");

  const keyFacts: KeyFact[] = AIRCRAFT_FIELDS.filter((f) => f.inDetail === "summary" && f.key !== "condition" && f.key !== "category").map((f) => ({ label: f.label, value: f.value?.(aircraft) }));

  // Datos del Motor
  const engineSummary: KeyFact[] | null = singleEngine
    ? [
        { label: "Marca", value: singleEngine.brand },
        { label: "Modelo", value: singleEngine.model },
        { label: "TBO", value: tboText(singleEngine.TBO) },
      ]
    : null;
  const sellerLocation = [seller.city, seller.province].filter(Boolean).join(", ");

  return (
    <>
      {!isInactive && <JsonLd data={aircraftJsonLd(aircraft)} />}
      {!isInactive && !isOwner && <TrackListingView type="AIRCRAFT" id={aircraft.id} />}

      {isInactive && isOwner && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-3 px-4 text-center flex items-center justify-center gap-2 print:hidden">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {aircraft.status === "SOLD"
              ? "Marcaste este aviso como vendido: no es visible para el público."
              : "Tu aviso está pausado y no es visible para el público. Lo activás desde tu perfil, si tenés cupo libre."}
          </span>
          <Link href={`/profile/${aircraft.sellerId}`} className="underline font-bold hover:text-amber-100 ml-2">
            Ir a mi perfil
          </Link>
        </div>
      )}

      {!isInactive && isOwner && (
        <OwnerRepublishBar view={republishView(await getRepublishStatus(aircraft.sellerId))} id={aircraft.id} kind="AIRCRAFT" profileHref={`/profile/${aircraft.sellerId}`} />
      )}

      {/* VISTA DE IMPRESIÓN PDF */}
      <div id="pdf-content" className="hidden print:block font-sans text-slate-900 p-10 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center border-b-2 border-[#00205B] pb-4 space-y-2 text-center">
          <div className="flex items-center justify-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.png" alt="Ventas Aeronáuticas" className="h-14 w-auto object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {broker?.logoUrl && <img src={broker.logoUrl} alt={`Logo de ${broker.name}`} className="h-14 w-auto max-w-[160px] object-contain" />}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
            <span>Ficha Técnica de Publicación</span>
            <span>•</span>
            <span className="font-bold text-[#00205B]">Ref: #{aircraft.id.slice(-6).toUpperCase()}</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString("es-AR")}</span>
          </div>
        </div>

        <div className="flex justify-between items-baseline bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <h2 className="text-2xl font-black text-[#00205B]">{aircraft.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Ubicación: {aircraft.city}, {aircraft.province}</p>
          </div>
          <span className="text-2xl font-black text-[var(--sidebar-primary)] shrink-0">{formattedPrice}</span>
        </div>

        {aircraft.images.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-[#00205B] tracking-wider">Fotografías de la Aeronave</h3>
            <div className="grid grid-cols-3 gap-3">
              {aircraft.images.slice(0, 3).map((img, idx) => (
                <div key={img.id || idx} className="h-36 relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`${aircraft.title} – foto ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {features.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
            <h3 className="text-xs font-bold uppercase text-[#00205B] border-b pb-1 mb-1.5 border-slate-100">Características</h3>
            <p className="text-slate-700">{features.map((f) => (f.value ? `${f.label}: ${f.value}` : f.label)).join(" · ")}</p>
          </div>
        )}

        <PrintSections sections={printSections} />

        {aircraft.description && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
            <h3 className="text-xs font-bold uppercase text-[#00205B] border-b pb-1 mb-1.5 border-slate-100">Descripción</h3>
            <DescriptionBody text={aircraft.description} />
          </div>
        )}

        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-1 text-slate-700">
          <h3 className="text-xs font-bold uppercase text-[#00205B] border-b pb-1 mb-1.5 border-slate-200">Contacto del Vendedor</h3>
          <p><span className="font-semibold text-slate-500">Nombre / Razón Social:</span> <span className="font-bold">{seller.name}</span></p>
          {sellerLocation && <p><span className="font-semibold text-slate-500">Ubicación:</span> {sellerLocation}</p>}
          {seller.phone && <p><span className="font-semibold text-slate-500">Teléfono:</span> {seller.phone}</p>}
          {seller.email && <p><span className="font-semibold text-slate-500">Email:</span> {seller.email}</p>}
        </div>
      </div>

      {/* BANNER SOLO PARA BROKERS (FUERA DEL CONTAINER DE MAIN) */}
      {broker && (
        <BrokerDetailHeader
          broker={broker}
          phone={seller.phone}
          email={seller.email}
          whatsappUrl={whatsappUrl}
          emailUrl={emailUrl}
          entityId={aircraft.id}
          entityType="AIRCRAFT"
          breadcrumbs={
            <Breadcrumbs 
              items={[{ label: "Aviones", href: "/aircraft" }, { label: aircraft.title }]} 
              jsonLd={false} 
              className="text-white/80 hover:text-white"
            />
          }
        />
      )}

      <main className="container flex flex-col gap-10 mx-auto px-4 py-8 print:hidden">
        <PageBackground page="aircraftDetail" />

        {/* BREADCRUMBS SOLO SI NO ES BROKER (PÁGINA COMÚN) */}
        {!broker && (
          <Breadcrumbs 
            items={[{ label: "Aviones", href: "/aircraft" }, { label: aircraft.title }]} 
            jsonLd={false} 
            className="-mt-4 -mb-6" 
          />
        )}

        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          <div className="contents lg:flex lg:w-2/3 lg:flex-col lg:gap-8">
            <div className="order-1 lg:order-none">
              <AircraftGallery images={aircraft.images} title={aircraft.title} video={broker ? youtubeId(aircraft.youtubeUrl) : null} fade={!!broker} />
            </div>

            {aircraft.description && (
              <div className="order-4 lg:order-none va-plate p-6">
                <ListingDescription text={aircraft.description} />
              </div>
            )}

            <div className="order-5 lg:order-none flex flex-col gap-5 lg:gap-8">
              <FeaturesCard title="Características de la aeronave" features={features} />
              <DetailSections sections={sections} />
            </div>
          </div>

          <div className="contents lg:flex lg:w-1/3 lg:flex-col lg:gap-5">
            {/* Tarjeta con los Datos de la Aeronave */}
            {/* Rediseño (25/10): la placa del resumen es el foco de la página: filete rojo arriba y el
                precio con su rótulo, como un instrumento. Mismo contenido y orden que antes. */}
            <div className="order-2 lg:order-none va-plate border-t-2 border-t-[#D62828] p-6 space-y-4">
              <PublishedLine createdAt={aircraft.createdAt} lastPublishedAt={aircraft.lastPublishedAt} location={listingLocation} />
              <AircraftActionsHeader title={aircraft.title} aircraftId={aircraft.id} isFavoriteInitial={isFavoriteInitial} compareImage={aircraft.images[0]?.url} />
              <Separator />
              <div>
                <h1 className="va-h1-keep text-[1.65rem] leading-[1.12] font-extrabold tracking-[-0.015em] text-[#00205B] break-words">{aircraft.title}</h1>
                {aircraft.category && (
                  <CategoryLinks items={[{ label: aircraft.category.name, href: `/aircraft?category=${encodeURIComponent(aircraft.category.id)}` }]} />
                )}
                <p className="va-label mt-4">Precio</p>
                <p className="font-heading text-[1.9rem] leading-none font-extrabold tracking-[-0.02em] text-[#00205B] tabular-nums">{formattedPrice}</p>
              </div>
              <Separator />
              <KeyFacts title="Datos de la aeronave" facts={keyFacts} />
              
              {/* Recuadro del Motor (se muestra si existe) */}
              {engineSummary && (
                <div className="pt-3 border-t border-slate-100">
                  <KeyFacts title="Motor" facts={engineSummary} />
                </div>
              )}
            </div>

            {/* TARJETA DE VENDEDOR COMÚN (SOLO PARA PÁGINAS QUE NO SEAN BROKER) */}
            {!broker && (
              <SellerContactCard
                className="order-3 lg:order-none"
                seller={seller}
                whatsappUrl={whatsappUrl}
                emailUrl={emailUrl}
                entityId={aircraft.id}
                entityType="AIRCRAFT"
              />
            )}

            <p className="order-3 lg:order-none -mt-2 px-1 text-xs text-slate-500">
              ¿Primera compra?{" "}
              <Link href="/services/guides/buying-a-used-aircraft" className="font-semibold text-[#00205B] underline decoration-[#D62828] decoration-2 underline-offset-4 hover:text-[#D62828]">
                Leé el checklist de pre-compra
              </Link>
            </p>

            <ListingLocationMap
              className="order-7 lg:order-none"
              latitude={aircraft.latitude}
              longitude={aircraft.longitude}
              city={aircraft.city}
              province={aircraft.province}
            />

            {aircraft.documents.length > 0 && (
              <div className="order-6 lg:order-none va-plate p-6 space-y-3">
                <h2 className="va-label">Documentación adjunta</h2>
                <div className="divide-y divide-[#00205B]/10 border-y border-[#00205B]/10">
                  {aircraft.documents.map((doc) => (
                    <a key={doc.id} href={`/api/listing-documents/${doc.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3 transition-colors w-full group hover:bg-[#F5F5F5]">
                      <FileText className="w-6 h-6 text-[#D62828] shrink-0" />
                      <span className="text-xs font-semibold text-[#00205B] group-hover:underline truncate">{doc.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <QnaSection
          entityId={aircraft.id}
          entityType="AIRCRAFT"
          questions={aircraft.questions || []}
          sellerName={seller.name ?? "El vendedor"}
          sellerId={aircraft.sellerId}
          currentUserId={session?.user?.id}
        />

        {moreFromSeller?.aircraft && <RecommendationRail kind="aircraft" id="mas-del-vendedor" block={moreFromSeller.aircraft} />}
        {moreFromSeller?.parts && <RecommendationRail kind="sparePart" id="repuestos-del-vendedor" block={moreFromSeller.parts} />}

        {similar && (
          <RecommendationRail
            kind="aircraft"
            id="similares"
            block={similar}
          />
        )}
        {parts && <RecommendationRail kind="sparePart" id="repuestos-para" block={parts} />}
      </main>
    </>
  );
}