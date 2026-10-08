import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "@/components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { QnaSection } from "@/components/ui/QnaSection";
import { PlaneActionsHeader } from "@/components/ui/PlaneActionsHeader";
import { AppImage } from "@/components/ui/AppImage";
import { auth } from "@/lib/auth";
import { ContactButtons } from "@/components/ui/ContactButtons";
import type { Metadata } from "next";
import { getSparePartDetail } from "@/lib/listing-data";
import { isListingActive } from "@/lib/listing-filters";
import { sparePartSeoDescription, sparePartSeoTitle } from "@/lib/listing-seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrackListingView } from "@/components/ui/listing/TrackListingView";
import { FeaturesCard } from "@/components/ui/listing/FeaturesCard";
import { DetailSections, PrintSections } from "@/components/ui/listing/DetailSections";
import { PublishedLine } from "@/components/ui/listing/PublishedLine";
import { sparePartConditionLabel, sparePartFeatures, sparePartSections } from "@/lib/listing-detail";
import { sparePartJsonLd } from "@/lib/structured-data";

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
  const session = await auth();

  const sparePart = await getSparePartDetail(id);

  if (!sparePart) notFound();

  const seller = await prisma.user.findUnique({
    where: { id: sparePart.sellerId },
  });

  if (!seller) notFound();

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
  const priceNumber = sparePart.price ? Number(sparePart.price) : null;
  const numberFormatted = priceNumber !== null 
    ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(priceNumber)
    : null;

  const formattedPrice = numberFormatted
    ? `${sparePart.inPesos ? "AR$" : "US$"} ${numberFormatted}`
    : "Consultar precio";

  // Ubicación del vendedor / producto
  const locationText = `${sparePart.city}, ${sparePart.province}`;
  const sellerLocation = [seller.city, seller.province].filter(Boolean).join(", ");

  // VA-57: características e "Información adicional" (incluye atributos y aeronaves
  // compatibles), ya sin vacíos.
  const features = sparePartFeatures(sparePart);
  const sections = sparePartSections(sparePart);

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
              optimizedWidth={1200}
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

        <PrintSections sections={sections} />

        {sparePart.description && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
            <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1 mb-1.5 border-slate-100">Descripción</h3>
            <p className="whitespace-pre-line text-slate-700">{sparePart.description}</p>
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

      {/* VISTA WEB NORMAL */}
      <main className="container flex flex-col gap-10 mx-auto px-4 py-8 print:hidden">
        <section className="flex flex-col lg:flex-row items-start gap-8">
          <div className="w-full lg:w-2/3 flex flex-col gap-8">
            {/* 1. Galería de Imágenes */}
            <AircraftGallery images={sparePart.images} title={sparePart.title} />

            {/* 2. DESCRIPCIÓN GENERAL (Ubicada inmediatamente debajo de las imágenes) */}
            {sparePart.description && (
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-3 text-[#001F58]">Descripción General</h2>
                <p className="whitespace-pre-line text-slate-700 text-sm leading-relaxed">
                  {sparePart.description}
                </p>
              </div>
            )}

            {/* BLOQUES VISIBLES SOLO EN MÓVIL (<lg) */}
            <div className="flex flex-col gap-5 lg:hidden">
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
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
                  <h3 className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">
                    {formattedPrice}
                  </h3>
                </div>

                <Separator />

                {/* DETALLES PRINCIPALES MÓVIL (lateral): solo Categoría y Subcategoría */}
                <div className="space-y-1 text-sm text-slate-700">
                  <h4 className="font-bold text-[#001F58] mb-2">Detalles principales</h4>
                  {sparePart.brand && (
                    <p><span className="font-semibold text-slate-500">Marca:</span> {sparePart.brand}</p>
                  )}
                  {sparePart.condition && (
                    <p><span className="font-semibold text-slate-500">Estado:</span> {sparePartConditionLabel(sparePart.condition)}</p>
                  )}
                  {categoryName && (
                    <p><span className="font-semibold text-slate-500">Categoría:</span> {categoryName}</p>
                  )}
                  {subcategoryName && (
                    <p><span className="font-semibold text-slate-500">Subcategoría:</span> {subcategoryName}</p>
                  )}
                  <p><span className="font-semibold text-slate-500">Stock:</span> {sparePart.stock} {sparePart.stock === 1 ? "unidad" : "unidades"}</p>
                </div>
              </div>

              {/* Vendedor y Contacto en Mobile */}
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#001F58]">Vendedor</h4>
                  <a
                    className="text-xs font-semibold text-blue-600 hover:underline"
                    href={`/profile/${seller.id}`}
                  >
                    Ver perfil
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  {seller.image ? (
                    <AppImage
                      className="rounded-full w-12 h-12 object-cover border border-slate-200"
                      src={seller.image}
                      alt={seller.name || "Foto del vendedor"}
                      width={48}
                      height={48}
                      optimizedWidth={100}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg border border-slate-200">
                      {seller.name?.charAt(0).toUpperCase() || "V"}
                    </div>
                  )}
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{seller.name}</h5>
                    {sellerLocation && <p className="text-xs text-slate-500">{sellerLocation}</p>}
                  </div>
                </div>

                <ContactButtons 
                  phone={seller.phone} 
                  email={seller.email} 
                  whatsappUrl={whatsappUrl} 
                  emailUrl={emailUrl} 
                  entityId={sparePart.id} 
                  entityType="SPARE_PART" 
                />
              </div>
            </div>

            {/* VA-57: características con íconos + tablas una debajo de la otra */}
            <FeaturesCard title="Características del repuesto" features={features} />
            <DetailSections sections={sections} />
          </div>

          {/* Columna Derecha (DESKTOP >= lg) - Flujo continuo sin sticky */}
          <div className="hidden lg:flex w-1/3 flex-col gap-5">
            <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <PublishedLine createdAt={sparePart.createdAt} location={locationText} />

              <PlaneActionsHeader
                title={sparePart.title}
                aircraftId={sparePart.id}
                type="SPARE_PART"
                isFavoriteInitial={isFavoriteInitial}
              />

              <Separator />

              <div>
                <p className="text-xl font-bold text-[#001F58]">{sparePart.title}</p>
                <h3 className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">
                  {formattedPrice}
                </h3>
              </div>

              <Separator />

              {/* DETALLES PRINCIPALES (lateral): solo Categoría y Subcategoría */}
              <div className="space-y-1 text-sm text-slate-700">
                <h4 className="font-bold text-[#001F58] mb-2">Detalles principales</h4>
                {sparePart.brand && (
                  <p><span className="font-semibold text-slate-500">Marca:</span> {sparePart.brand}</p>
                )}
                {sparePart.condition && (
                  <p><span className="font-semibold text-slate-500">Estado:</span> {sparePartConditionLabel(sparePart.condition)}</p>
                )}
                {categoryName && (
                  <p><span className="font-semibold text-slate-500">Categoría:</span> {categoryName}</p>
                )}
                {subcategoryName && (
                  <p><span className="font-semibold text-slate-500">Subcategoría:</span> {subcategoryName}</p>
                )}
                <p><span className="font-semibold text-slate-500">Stock:</span> {sparePart.stock} {sparePart.stock === 1 ? "unidad" : "unidades"}</p>
              </div>
            </div>

            {/* Vendedor */}
            <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#001F58]">Vendedor</h4>
                <a
                  className="text-xs font-semibold text-blue-600 hover:underline"
                  href={`/profile/${seller.id}`}
                >
                  Ver perfil
                </a>
              </div>

              <div className="flex items-center gap-3">
                {seller.image ? (
                  <AppImage
                    className="rounded-full w-12 h-12 object-cover border border-slate-200"
                    src={seller.image}
                    alt={seller.name || "Foto del vendedor"}
                    width={48}
                    height={48}
                    optimizedWidth={100}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg border border-slate-200">
                    {seller.name?.charAt(0).toUpperCase() || "V"}
                  </div>
                )}
                <div>
                  <h5 className="font-bold text-slate-800 text-sm">{seller.name}</h5>
                  {sellerLocation && <p className="text-xs text-slate-500">{sellerLocation}</p>}
                </div>
              </div>

              <ContactButtons 
                phone={seller.phone} 
                email={seller.email} 
                whatsappUrl={whatsappUrl} 
                emailUrl={emailUrl} 
                entityId={sparePart.id} 
                entityType="SPARE_PART" 
              />
            </div>
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