import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "@/components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { QnaSection } from "@/components/ui/QnaSection";
import { AircraftActionsHeader } from "@/components/ui/AircraftActionsHeader";
import { AppImage } from "@/components/ui/AppImage";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { getSparePartDetail } from "@/lib/listing-data";
import { isListingActive } from "@/lib/listing-filters";
import { sparePartSeoDescription, sparePartSeoTitle } from "@/lib/listing-seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { InactiveListingNotice } from "@/components/ui/listing/InactiveListingNotice";
import { TrackListingView } from "@/components/ui/listing/TrackListingView";
import { FeaturesCard } from "@/components/ui/listing/FeaturesCard";
import { DetailSections, PrintSections } from "@/components/ui/listing/DetailSections";
import { PublishedLine } from "@/components/ui/listing/PublishedLine";
import { sparePartConditionLabel, sparePartFeatures, sparePartSections } from "@/lib/listing-detail";
import { CategoryLinks } from "@/components/ui/listing/CategoryLinks";
import { KeyFacts, type KeyFact } from "@/components/ui/listing/KeyFacts";
import { DescriptionBody, ListingDescription } from "@/components/ui/listing/ListingDescription";
import { SellerContactCard } from "@/components/ui/listing/SellerContactCard";
import { ListingLocationMap } from "@/components/ui/ListingLocationMap";
import { sparePartJsonLd } from "@/lib/structured-data";
import { formatPrice } from "@/lib/format";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { OwnerRepublishBar } from "@/components/ui/listing/OwnerRepublishBar";
import { BrokerDetailHeader } from "@/components/ui/listing/BrokerDetailHeader";
import { getBrokerDetail } from "@/lib/broker-detail";
import { youtubeId } from "@/lib/youtube";
import { getMoreFromSeller } from "@/lib/recommendations";
import { getRepublishStatus, republishView } from "@/lib/republish";
import { RecommendationRail } from "@/components/ui/recommendations/RecommendationRail";
import { getAircraftForPart, getSimilarParts } from "@/lib/recommendations";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sparePart = await getSparePartDetail(id);
  if (!sparePart) notFound();

  const title = sparePartSeoTitle(sparePart);
  const description = sparePartSeoDescription(sparePart);
  const url = `/spareparts/sparepart-details/${sparePart.id}`;
  const cover = sparePart.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: isListingActive(sparePart) ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(cover ? { images: [{ url: cover, alt: sparePart.title }] } : {}),
    },
  };
}

export default async function SparePartDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, sparePart] = await Promise.all([auth(), getSparePartDetail(id)]);

  if (!sparePart) notFound();

  if (!isListingActive(sparePart) && session?.user?.id !== sparePart.sellerId) {
    return <InactiveListingNotice backHref="/spareparts" backLabel="Ver otros repuestos" background="spareparts" />;
  }

  const seller = sparePart.seller;

  let isFavoriteInitial = false;
  if (session?.user?.id) {
    const fav = await prisma.favorite.findFirst({
      where: {
        userId: session.user.id,
        sparePartId: sparePart.id,
      },
      select: { id: true },
    });
    isFavoriteInitial = Boolean(fav);
  }

  const subject = encodeURIComponent(`Consulta por repuesto ${sparePart.title}`);
  const body = encodeURIComponent(
    `Hola, estoy interesado en el repuesto "${sparePart.title}" publicado en Ventas Aeronáuticas.`
  );

  const emailUrl = seller.email ? `mailto:${seller.email}?subject=${subject}&body=${body}` : null;
  const cleanPhone = seller.phone ? seller.phone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${body}`
    : null;

  const formattedPrice = formatPrice(sparePart.price, { inPesos: sparePart.inPesos });
  const locationText = `${sparePart.city}, ${sparePart.province}`;
  const sellerLocation = [seller.city, seller.province].filter(Boolean).join(", ");

  const features = sparePartFeatures(sparePart);
  const sections = sparePartSections(sparePart, { omitSummary: true });
  const printSections = sparePartSections(sparePart);

  const recSource = {
    id: sparePart.id,
    title: sparePart.title,
    partNumber: sparePart.partNumber,
    description: sparePart.description,
    categoryId: sparePart.categoryId,
    brand: sparePart.brand,
    aircrafts: sparePart.aircrafts,
  };
  const [similarParts, relatedAircraft] = await Promise.all([getSimilarParts(recSource), getAircraftForPart(recSource)]);

  const broker = await getBrokerDetail(sparePart.sellerId);
  const moreFromSeller = broker ? await getMoreFromSeller(sparePart.sellerId, sparePart.id, broker.name) : null;

  const leafCategory = sparePart.category;
  const midCategory = leafCategory?.parent ?? null;
  const rootCategory = midCategory?.parent ?? null;

  type CategoryRef = { id: string; name: string } | null;
  let category: CategoryRef = null;
  let subcategory: CategoryRef = null;

  if (rootCategory) {
    category = rootCategory;
    subcategory = midCategory;
  } else if (midCategory) {
    category = midCategory;
    subcategory = leafCategory;
  } else if (leafCategory) {
    category = leafCategory;
  }
  const subcategoryName = subcategory?.name ?? null;
  const categoryLinks = category ? [{ label: category.name, href: `/spareparts?category=${encodeURIComponent(category.id)}` }] : [];

  const keyFacts: KeyFact[] = [
    { label: "Marca", value: sparePart.brand },
    { label: "Estado", value: sparePart.condition ? sparePartConditionLabel(sparePart.condition) : null },
    { label: "Stock", value: `${sparePart.stock} ${sparePart.stock === 1 ? "unidad" : "unidades"}` },
    { label: "Subcategoría", value: subcategoryName },
  ];

  return (
    <>
      {/* Datos estructurados */}
      {isListingActive(sparePart) && <JsonLd data={sparePartJsonLd(sparePart)} />}
      {isListingActive(sparePart) && session?.user?.id !== sparePart.sellerId && (
        <TrackListingView type="SPARE_PART" id={sparePart.id} />
      )}

      {/* Bar para republicar (dueño) */}
      {isListingActive(sparePart) && session?.user?.id === sparePart.sellerId && (
        <OwnerRepublishBar view={republishView(await getRepublishStatus(sparePart.sellerId))} id={sparePart.id} kind="SPARE_PART" profileHref={`/profile/${sparePart.sellerId}`} />
      )}

      {/* VISTA DE IMPRESIÓN / PDF */}
      <div className="hidden print:block font-sans text-black p-4 space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-end border-b-2 border-black pb-3">
          <div>
            <p className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              Ventas Aeronáuticas
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {broker?.logoUrl && <img src={broker.logoUrl} alt={`Logo de ${broker.name}`} className="mt-1 h-10 w-auto max-w-[140px] object-contain" />}
            <p className="text-xs text-slate-500">Ficha Técnica de Repuesto</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">Publicado el {sparePart.createdAt.toLocaleDateString("es-AR")}</p>
            <p className="text-slate-500">ID Ref: {sparePart.id.slice(-6).toUpperCase()}</p>
          </div>
        </div>

        <div className="flex justify-between items-start gap-4">
          <h2 className="text-2xl font-black text-black">{sparePart.title}</h2>
          <span className="text-2xl font-black text-[var(--sidebar-primary)] text-slate-900 shrink-0">
            {formattedPrice}
          </span>
        </div>

        {sparePart.images[0] && (
          <div className="w-full h-[380px] bg-slate-100 border border-slate-300 rounded-lg overflow-hidden my-4 relative">
            <AppImage
              src={sparePart.images[0].url}
              alt={sparePart.title}
              fill
              className="object-contain"
            />
          </div>
        )}

        <p className="text-xs text-slate-500">Ubicación: {locationText}</p>

        {features.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
            <h3 className="text-xs font-bold uppercase text-[#00205B] border-b pb-1 mb-1.5 border-slate-100">Características</h3>
            <p className="text-slate-700">{features.map((f) => (f.value ? `${f.label}: ${f.value}` : f.label)).join(" · ")}</p>
          </div>
        )}

        <PrintSections sections={printSections} />

        {sparePart.description && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
            <h3 className="text-xs font-bold uppercase text-[#00205B] border-b pb-1 mb-1.5 border-slate-100">Descripción</h3>
            <DescriptionBody text={sparePart.description} />
          </div>
        )}

        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-1 text-slate-700">
          <h3 className="text-xs font-bold uppercase text-[#00205B] border-b pb-1 mb-1.5 border-slate-200">Datos del Vendedor</h3>
          <p><span className="font-semibold">Nombre:</span> {seller.name}</p>
          {sellerLocation && <p><span className="font-semibold">Ubicación:</span> {sellerLocation}</p>}
          {seller.phone && <p><span className="font-semibold">Teléfono:</span> {seller.phone}</p>}
          {seller.email && <p><span className="font-semibold">Email:</span> {seller.email}</p>}
        </div>

        <div className="pt-2 text-center text-[10px] text-slate-400">
          <p>Documento generado desde Ventas Aeronáuticas - Marketplace de Aviones y Repuestos</p>
        </div>
      </div>

      {/* Aviso de inactividad para el dueño */}
      {!isListingActive(sparePart) && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-3 px-4 text-center flex items-center justify-center gap-2 print:hidden">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {sparePart.status === "SOLD"
              ? "Marcaste este aviso como vendido: no es visible para el público."
              : "Tu aviso está pausado y no es visible para el público. Lo activás desde tu perfil, si tenés cupo libre."}
          </span>
          <Link href={`/profile/${sparePart.sellerId}`} className="underline font-bold hover:text-amber-100 ml-2">
            Ir a mi perfil
          </Link>
        </div>
      )}

      {/* BANNER SOLO PARA BROKERS (FUERA DEL CONTAINER DE MAIN) */}
      {broker && (
        <BrokerDetailHeader
          broker={broker}
          phone={seller.phone}
          email={seller.email}
          whatsappUrl={whatsappUrl}
          emailUrl={emailUrl}
          entityId={sparePart.id}
          entityType="SPARE_PART"
          breadcrumbs={
            <Breadcrumbs 
              items={[{ label: "Repuestos", href: "/spareparts" }, { label: sparePart.title }]} 
              jsonLd={false} 
              className="text-white/80 hover:text-white"
            />
          }
        />
      )}

      {/* VISTA WEB */}
      <main className="container flex flex-col gap-10 mx-auto px-4 py-8 print:hidden">
        <PageBackground page="spareparts" />

        {/* BREADCRUMBS SOLO SI NO ES BROKER (PÁGINA COMÚN) */}
        {!broker && (
          <Breadcrumbs 
            items={[{ label: "Repuestos", href: "/spareparts" }, { label: sparePart.title }]} 
            jsonLd={false} 
            className="-mt-4 -mb-6" 
          />
        )}

        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          <div className="contents lg:flex lg:w-2/3 lg:flex-col lg:gap-8">
            <div className="order-1 lg:order-none">
              <AircraftGallery images={sparePart.images} title={sparePart.title} video={broker ? youtubeId(sparePart.youtubeUrl) : null} fade={!!broker} />
            </div>

            {sparePart.description && (
              <div className="order-4 lg:order-none border border-slate-200 rounded-lg bg-white p-6 shadow-sm">
                <ListingDescription text={sparePart.description} />
              </div>
            )}

            <div className="order-5 lg:order-none flex flex-col gap-5 lg:gap-8">
              <FeaturesCard title="Características del repuesto" features={features} />
              <DetailSections sections={sections} />
            </div>
          </div>

          <div className="contents lg:flex lg:w-1/3 lg:flex-col lg:gap-5">
            {/* Tarjeta con los Detalles Principales del Repuesto */}
            <div className="order-2 lg:order-none border border-slate-200 rounded-lg bg-white p-6 shadow-sm space-y-4">
              <PublishedLine createdAt={sparePart.createdAt} lastPublishedAt={sparePart.lastPublishedAt} location={locationText} />
              <AircraftActionsHeader
                title={sparePart.title}
                aircraftId={sparePart.id}
                type="SPARE_PART"
                isFavoriteInitial={isFavoriteInitial}
              />
              <Separator />
              <div>
                <h1 className="text-2xl font-bold text-[#00205B] break-words">{sparePart.title}</h1>
                <CategoryLinks items={categoryLinks} />
                <p className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">{formattedPrice}</p>
              </div>
              <Separator />
              <KeyFacts title="Detalles principales" facts={keyFacts} />
            </div>

            {/* TARJETA DE VENDEDOR COMÚN (SOLO SI NO ES BROKER) */}
            {!broker && (
              <SellerContactCard
                className="order-3 lg:order-none"
                seller={seller}
                whatsappUrl={whatsappUrl}
                emailUrl={emailUrl}
                entityId={sparePart.id}
                entityType="SPARE_PART"
              />
            )}

            {/* Mapa de ubicación */}
            <ListingLocationMap
              className="order-7 lg:order-none"
              latitude={sparePart.latitude}
              longitude={sparePart.longitude}
              city={sparePart.city}
              province={sparePart.province}
            />
          </div>
        </section>

        {/* Sección Preguntas y Respuestas */}
        <QnaSection
          entityId={sparePart.id}
          entityType="SPARE_PART"
          questions={sparePart.questions || []}
          sellerName={seller.name ?? "El vendedor"}
          sellerId={sparePart.sellerId}
          currentUserId={session?.user?.id}
        />

        {/* Recomendaciones */}
        {moreFromSeller?.parts && <RecommendationRail kind="sparePart" id="mas-del-vendedor" block={moreFromSeller.parts} />}
        {moreFromSeller?.aircraft && <RecommendationRail kind="aircraft" id="aviones-del-vendedor" block={moreFromSeller.aircraft} />}
        {similarParts && <RecommendationRail kind="sparePart" id="similares" block={similarParts} />}
        {relatedAircraft && <RecommendationRail kind="aircraft" id="aeronaves-relacionadas" block={relatedAircraft} />}
      </main>
    </>
  );
}