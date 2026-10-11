import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../../components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { FileText, AlertTriangle } from "lucide-react";
import { QnaSection } from "@/components/ui/QnaSection";
import { PlaneActionsHeader } from "@/components/ui/PlaneActionsHeader";
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
import { KeyFacts, type KeyFact } from "@/components/ui/listing/KeyFacts";
import { DescriptionBody, ListingDescription } from "@/components/ui/listing/ListingDescription";
import { SellerContactCard } from "@/components/ui/listing/SellerContactCard";
import { ListingLocationMap } from "@/components/ui/ListingLocationMap";
import { SimilarCompare } from "@/components/ui/compare/SimilarCompare";
import { getSimilarAircraft } from "@/lib/similar-aircraft";
import { aircraftJsonLd } from "@/lib/structured-data";
import { formatPrice } from "@/lib/format";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const aircraft = await getAircraftDetail(id);
  if (!aircraft) notFound();

  const title = aircraftSeoTitle(aircraft);
  const description = aircraftSeoDescription(aircraft);
  const url = `/planes/plane-details/${aircraft.id}`;
  const cover = aircraft.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: url },
    // Pausada, vencida, vendida o pendiente de pago: no se indexa.
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

export default async function PlaneDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Sesión y publicación (con el vendedor incluido) en paralelo (VA-13).
  const [session, aircraft] = await Promise.all([auth(), getAircraftDetail(id)]);

  if (!aircraft) notFound();

  // VALIDACIÓN DE VENCIMIENTO / PAUSA
  const isOwner = session?.user?.id === aircraft.sellerId;
  const isInactive = !isListingActive(aircraft);

  if (isInactive && !isOwner) {
    return <InactiveListingNotice backHref="/planes" backLabel="Ver otros aviones" background="planeDetail" />;
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

  // Recuadro "Motor" del resumen: un solo motor y nunca en Bimotor (VA-41).
  const singleEngine = showsEngineSummary(aircraft) ? aircraft.engines[0] : null;

  const formattedPrice = formatPrice(aircraft.price);

  // VA-44: las horas son opcionales en Agrícola, Experimental y Proyecto.
  const tboText = (tbo: number | null) => (tbo != null ? `${tbo} hs` : "No informado");

  // VA-57: características e "Información adicional", ya sin vacíos.
  const features = aircraftFeatures(aircraft);
  // VA-83: atajo "Comparar con similares" (misma categoría y precio parecido).
  const similar = await getSimilarAircraft(aircraft);
  // Web: la ficha no repite lo del resumen. Impresión: ficha completa.
  const sections = aircraftSections(aircraft, { omitSummary: true });
  const printSections = aircraftSections(aircraft);
  const listingLocation = [aircraft.city, aircraft.province].filter(Boolean).join(", ");

  // VA-83: los datos del resumen salen de la misma lista que la ficha y el comparador.
  const keyFacts: KeyFact[] = AIRCRAFT_FIELDS.filter((f) => f.inDetail === "summary").map((f) => ({ label: f.label, value: f.value?.(aircraft) }));
  // Recuadro "Motor" junto a las fotos: marca, modelo y TBO, en ese orden (pedido del socio, 9/10).
  // Todos los datos del motor siguen en la ficha de abajo.
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
      {/* Datos estructurados: solo para avisos visibles al público */}
      {!isInactive && <JsonLd data={aircraftJsonLd(aircraft)} />}
      {!isInactive && !isOwner && <TrackListingView type="AIRCRAFT" id={aircraft.id} />}

      {/* BANNER AVISO DE PAUSA SOLO PARA EL DUEÑO */}
      {isInactive && isOwner && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-3 px-4 text-center flex items-center justify-center gap-2 print:hidden">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Tu publicación está pausada/vencida y no es visible para el público. Ve a tu perfil para renovarla por 45 días más.
          </span>
          <Link href="/profile" className="underline font-bold hover:text-amber-100 ml-2">
            Ir a mi perfil
          </Link>
        </div>
      )}

      {/* VISTA Y FORMATO DE EXPORTACIÓN PDF */}
      <div id="pdf-content" className="hidden print:block font-sans text-slate-900 p-10 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center border-b-2 border-[#001F58] pb-4 space-y-2 text-center">
          {/* Vista de impresión: <img> a propósito; next/image cargaría diferido dentro de un bloque
              oculto y las fotos podrían salir en blanco en el PDF. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Ventas Aeronáuticas" className="h-14 w-auto object-contain mx-auto" />
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
            <span>Ficha Técnica de Publicación</span>
            <span>•</span>
            <span className="font-bold text-[#001F58]">Ref: #{aircraft.id.slice(-6).toUpperCase()}</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString("es-AR")}</span>
          </div>
        </div>

        <div className="flex justify-between items-baseline bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <h2 className="text-2xl font-black text-[#001F58]">{aircraft.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Ubicación: {aircraft.city}, {aircraft.province}</p>
          </div>
          <span className="text-2xl font-black text-[var(--sidebar-primary)] shrink-0">{formattedPrice}</span>
        </div>

        {aircraft.images.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-[#001F58] tracking-wider">Fotografías de la Aeronave</h3>
            <div className="grid grid-cols-3 gap-3">
              {aircraft.images.slice(0, 3).map((img, idx) => (
                <div key={img.id || idx} className="h-36 relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista de impresión (ver arriba) */}
                  <img src={img.url} alt={`${aircraft.title} – foto ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {features.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
            <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1 mb-1.5 border-slate-100">Características</h3>
            <p className="text-slate-700">{features.map((f) => (f.value ? `${f.label}: ${f.value}` : f.label)).join(" · ")}</p>
          </div>
        )}

        <PrintSections sections={printSections} />

        {aircraft.description && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
            <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1 mb-1.5 border-slate-100">Descripción</h3>
            <DescriptionBody text={aircraft.description} />
          </div>
        )}

        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-1 text-slate-700">
          <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1 mb-1.5 border-slate-200">Contacto del Vendedor</h3>
          <p><span className="font-semibold text-slate-500">Nombre / Razón Social:</span> <span className="font-bold">{seller.name}</span></p>
          {sellerLocation && <p><span className="font-semibold text-slate-500">Ubicación:</span> {sellerLocation}</p>}
          {seller.phone && <p><span className="font-semibold text-slate-500">Teléfono:</span> {seller.phone}</p>}
          {seller.email && <p><span className="font-semibold text-slate-500">Email:</span> {seller.email}</p>}
        </div>
      </div>

      {/* VISTA WEB — VA-41: un solo árbol, sin copias mobile/desktop. En celular las dos columnas son
          "contents" y los bloques se ordenan con order-*: fotos → título y precio → vendedor →
          descripción → ficha técnica → documentos. Desde lg: izquierda (fotos, descripción, ficha) y
          derecha (resumen, vendedor, documentos). */}
      <main className="container flex flex-col gap-10 mx-auto px-4 py-8 print:hidden">
        <PageBackground page="planeDetail" />
        <Breadcrumbs items={[{ label: "Aviones", href: "/planes" }, { label: aircraft.title }]} jsonLd={false} className="-mt-4 -mb-6" />
        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          <div className="contents lg:flex lg:w-2/3 lg:flex-col lg:gap-8">
            <div className="order-1 lg:order-none">
              <AircraftGallery images={aircraft.images} title={aircraft.title} />
            </div>

            {aircraft.description && (
              <div className="order-4 lg:order-none border border-slate-200 rounded-2xl bg-white p-6 shadow-sm">
                <ListingDescription text={aircraft.description} />
              </div>
            )}

            {/* VA-57: características con íconos + tablas (sin repetir lo del resumen) */}
            <div className="order-5 lg:order-none flex flex-col gap-5 lg:gap-8">
              <FeaturesCard title="Características de la aeronave" features={features} />
              <DetailSections sections={sections} />
              <SimilarCompare currentId={aircraft.id} items={similar} />
            </div>
          </div>

          <div className="contents lg:flex lg:w-1/3 lg:flex-col lg:gap-5">
            {/* Resumen: título, precio, acciones y datos clave */}
            <div className="order-2 lg:order-none border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <PublishedLine createdAt={aircraft.createdAt} location={listingLocation} />
              <PlaneActionsHeader title={aircraft.title} aircraftId={aircraft.id} isFavoriteInitial={isFavoriteInitial} compareImage={aircraft.images[0]?.url} />
              <Separator />
              <div>
                <h1 className="text-xl font-bold text-[#001F58]">{aircraft.title}</h1>
                <p className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">{formattedPrice}</p>
              </div>
              <Separator />
              <KeyFacts title="Datos de la aeronave" facts={keyFacts} />
              {engineSummary && (
                <div className="pt-3 border-t border-slate-100">
                  <KeyFacts title="Motor" facts={engineSummary} />
                </div>
              )}
            </div>

            <SellerContactCard
              className="order-3 lg:order-none"
              seller={seller}
              whatsappUrl={whatsappUrl}
              emailUrl={emailUrl}
              entityId={aircraft.id}
              entityType="AIRCRAFT"
            />

            {/* VA-78: link discreto a la guía de pre-compra */}
            <p className="order-3 lg:order-none -mt-2 px-1 text-xs text-slate-500">
              ¿Primera compra?{" "}
              <Link href="/services/guides/buying-a-used-aircraft" className="font-semibold text-[#001F58] hover:text-[#E70F1F] hover:underline">
                Leé el checklist de pre-compra
              </Link>
            </p>

            {/* VA-83: zona aproximada (centroide de la localidad, círculo de ~5 km) */}
            <ListingLocationMap
              className="order-3 lg:order-none"
              latitude={aircraft.latitude}
              longitude={aircraft.longitude}
              city={aircraft.city}
              province={aircraft.province}
            />

            {aircraft.documents.length > 0 && (
              <div className="order-6 lg:order-none border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-3">
                <h2 className="font-bold text-[#001F58] text-sm">Documentación Adjunta</h2>
                <div className="space-y-2">
                  {aircraft.documents.map((doc) => (
                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition-colors w-full group">
                      <FileText className="w-7 h-7 text-red-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-[#001F58] truncate">{doc.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sección Preguntas y Respuestas */}
        <QnaSection
          entityId={aircraft.id}
          entityType="AIRCRAFT"
          questions={aircraft.questions || []}
          sellerName={seller.name ?? "El vendedor"}
          sellerId={aircraft.sellerId}
          currentUserId={session?.user?.id}
        />
      </main>
    </>
  );
}