import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "@/components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { QnaSection } from "@/components/ui/QnaSection";
import { PlaneActionsHeader } from "@/components/ui/PlaneActionsHeader";
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
import { KeyFacts, type KeyFact } from "@/components/ui/listing/KeyFacts";
import { DescriptionBody, ListingDescription } from "@/components/ui/listing/ListingDescription";
import { SellerContactCard } from "@/components/ui/listing/SellerContactCard";
import { sparePartJsonLd } from "@/lib/structured-data";
import { formatPrice } from "@/lib/format";
import { PageBackground } from "@/components/ui/PageBackground";

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
    // Vencida, vendida o pendiente de pago: no se indexa.
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
  // Sesión y publicación (con el vendedor incluido) en paralelo (VA-13).
  const [session, sparePart] = await Promise.all([auth(), getSparePartDetail(id)]);

  if (!sparePart) notFound();

  // Vencida o pausada: solo la ve el dueño, como en el detalle de avión (VA-14).
  if (!isListingActive(sparePart) && session?.user?.id !== sparePart.sellerId) {
    return <InactiveListingNotice backHref="/spareparts" backLabel="Ver otros repuestos" background="spareparts" />;
  }

  const seller = sparePart.seller;

  // Comprobar si la publicación está guardada en los favoritos del usuario actual
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

  // Formato explícito de precio (AR$ o US$)
  const formattedPrice = formatPrice(sparePart.price, { inPesos: sparePart.inPesos });

  // Ubicación del vendedor / producto
  const locationText = `${sparePart.city}, ${sparePart.province}`;
  const sellerLocation = [seller.city, seller.province].filter(Boolean).join(", ");

  // VA-57: características e "Información adicional" (incluye atributos y aeronaves
  // compatibles), ya sin vacíos.
  const features = sparePartFeatures(sparePart);
  // Web: la ficha no repite lo del resumen. Impresión: ficha completa.
  const sections = sparePartSections(sparePart, { omitSummary: true });
  const printSections = sparePartSections(sparePart);

  // Reconstrucción de la jerarquía de categorías del repuesto.
  // sparePart.category es siempre el nivel más específico que eligió el vendedor:
  // puede ser la Subcategoría (2 niveles) o la Sección (3 niveles, sub-subcategoría).
  const leafCategory = sparePart.category;
  const midCategory = leafCategory?.parent ?? null;
  const rootCategory = midCategory?.parent ?? null;

  let categoryName: string | null = null;
  let subcategoryName: string | null = null;

  if (rootCategory) {
    // Categoría (raíz) > Subcategoría (mid) > Sección (leaf)
    categoryName = rootCategory.name;
    subcategoryName = midCategory?.name ?? null;
  } else if (midCategory) {
    // Categoría (mid) > Subcategoría (leaf) — no hay Sección
    categoryName = midCategory.name;
    subcategoryName = leafCategory?.name ?? null;
  } else if (leafCategory) {
    // Solo hay categoría raíz
    categoryName = leafCategory.name;
  }

  // Datos clave del resumen (VA-41): grilla de 2 columnas.
  const keyFacts: KeyFact[] = [
    { label: "Marca", value: sparePart.brand },
    { label: "Nº de parte", value: sparePart.partNumber },
    { label: "Estado", value: sparePart.condition ? sparePartConditionLabel(sparePart.condition) : null },
    { label: "Stock", value: `${sparePart.stock} ${sparePart.stock === 1 ? "unidad" : "unidades"}` },
    { label: "Categoría", value: categoryName },
    { label: "Subcategoría", value: subcategoryName },
  ];

  return (
    <>
      {/* Datos estructurados: solo para avisos visibles al público */}
      {isListingActive(sparePart) && <JsonLd data={sparePartJsonLd(sparePart)} />}
      {isListingActive(sparePart) && session?.user?.id !== sparePart.sellerId && (
        <TrackListingView type="SPARE_PART" id={sparePart.id} />
      )}

      {/* VISTA DE IMPRESIÓN / PDF */}
      <div className="hidden print:block font-sans text-black p-4 space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-end border-b-2 border-black pb-3">
          <div>
            <p className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              Ventas Aeronáuticas
            </p>
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
            <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1 mb-1.5 border-slate-100">Características</h3>
            <p className="text-slate-700">{features.map((f) => (f.value ? `${f.label}: ${f.value}` : f.label)).join(" · ")}</p>
          </div>
        )}

        <PrintSections sections={printSections} />

        {sparePart.description && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
            <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1 mb-1.5 border-slate-100">Descripción</h3>
            <DescriptionBody text={sparePart.description} />
          </div>
        )}

        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-1 text-slate-700">
          <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1 mb-1.5 border-slate-200">Datos del Vendedor</h3>
          <p><span className="font-semibold">Nombre:</span> {seller.name}</p>
          {sellerLocation && <p><span className="font-semibold">Ubicación:</span> {sellerLocation}</p>}
          {seller.phone && <p><span className="font-semibold">Teléfono:</span> {seller.phone}</p>}
          {seller.email && <p><span className="font-semibold">Email:</span> {seller.email}</p>}
        </div>

        <div className="pt-2 text-center text-[10px] text-slate-400">
          <p>Documento generado desde Ventas Aeronáuticas - Marketplace de Aviones y Repuestos</p>
        </div>
      </div>

      {/* VISTA WEB — VA-41: un solo árbol, mismo orden que el detalle de avión. En celular:
          fotos → título y precio → vendedor → descripción → ficha. Desde lg: dos columnas. */}
      <main className="container flex flex-col gap-10 mx-auto px-4 py-8 print:hidden">
        <PageBackground page="spareparts" />
        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          <div className="contents lg:flex lg:w-2/3 lg:flex-col lg:gap-8">
            <div className="order-1 lg:order-none">
              <AircraftGallery images={sparePart.images} title={sparePart.title} />
            </div>

            {sparePart.description && (
              <div className="order-4 lg:order-none border border-slate-200 rounded-2xl bg-white p-6 shadow-sm">
                <ListingDescription text={sparePart.description} />
              </div>
            )}

            {/* VA-57: características con íconos + tablas (sin repetir lo del resumen) */}
            <div className="order-5 lg:order-none flex flex-col gap-5 lg:gap-8">
              <FeaturesCard title="Características del repuesto" features={features} />
              <DetailSections sections={sections} />
            </div>
          </div>

          <div className="contents lg:flex lg:w-1/3 lg:flex-col lg:gap-5">
            <div className="order-2 lg:order-none border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <PublishedLine createdAt={sparePart.createdAt} location={locationText} />
              <PlaneActionsHeader
                title={sparePart.title}
                aircraftId={sparePart.id}
                type="SPARE_PART"
                isFavoriteInitial={isFavoriteInitial}
              />
              <Separator />
              <div>
                <h1 className="text-xl font-bold text-[#001F58]">{sparePart.title}</h1>
                <p className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">{formattedPrice}</p>
              </div>
              <Separator />
              <KeyFacts title="Detalles principales" facts={keyFacts} />
            </div>

            <SellerContactCard
              className="order-3 lg:order-none"
              seller={seller}
              whatsappUrl={whatsappUrl}
              emailUrl={emailUrl}
              entityId={sparePart.id}
              entityType="SPARE_PART"
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
      </main>
    </>
  );
}