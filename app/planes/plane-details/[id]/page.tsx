import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../../components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { FileText, AlertTriangle, ArrowLeft } from "lucide-react";
import { QnaSection } from "@/components/ui/QnaSection";
import { PlaneActionsHeader } from "@/components/ui/PlaneActionsHeader";
import { AppImage } from "@/components/ui/AppImage";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { ContactButtons } from "@/components/ui/ContactButtons";
import type { Metadata } from "next";
import { getAircraftDetail } from "@/lib/listing-data";
import { isListingActive } from "@/lib/listing-filters";
import { aircraftSeoDescription, aircraftSeoTitle } from "@/lib/listing-seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { TrackListingView } from "@/components/ui/listing/TrackListingView";
import { FeaturesCard } from "@/components/ui/listing/FeaturesCard";
import { DetailSections, PrintSections } from "@/components/ui/listing/DetailSections";
import { PublishedLine } from "@/components/ui/listing/PublishedLine";
import { aircraftFeatures, aircraftSections } from "@/lib/listing-detail";
import { ENGINE_LABELS } from "@/lib/aircraft-categories";
import { aircraftJsonLd } from "@/lib/structured-data";

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
  const session = await auth();
  

  const aircraft = await getAircraftDetail(id);

  if (!aircraft) notFound();

  // VALIDACIÓN DE VENCIMIENTO / PAUSA
  const isOwner = session?.user?.id === aircraft.sellerId;
  const isInactive = !isListingActive(aircraft);

  if (isInactive && !isOwner) {
    return (
      <main className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
        <div className="p-8 max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#001F58]">Publicación Pausada o Inactiva</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Esta publicación ya no se encuentra disponible públicamente debido a que venció su periodo de publicación o fue pausada por el vendedor.
          </p>
          <div className="pt-2">
            <Link
              href="/planes"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#001F58] text-white font-semibold text-xs rounded-xl hover:bg-blue-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver otros aviones
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const seller = await prisma.user.findUnique({
    where: { id: aircraft.sellerId },
  });

  if (!seller) notFound();

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

  const hasSingleEngine = aircraft.engines.length === 1;
  const singleEngine = hasSingleEngine ? aircraft.engines[0] : null;

  const formattedPrice = aircraft.price
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(aircraft.price))
    : "Consultar precio";

  // VA-44: las horas son opcionales en Agrícola, Experimental y Proyecto.
  const tboText = (tbo: number | null) => (tbo != null ? `${tbo} hs` : "No informado");
  const hoursText = aircraft.totalTimeHours != null ? `${aircraft.totalTimeHours.toLocaleString("es-AR")} hs` : "No informadas";

  // VA-57: características e "Información adicional", ya sin vacíos.
  const features = aircraftFeatures(aircraft);
  const sections = aircraftSections(aircraft);
  const listingLocation = [aircraft.city, aircraft.province].filter(Boolean).join(", ");

  const displayBrand = aircraft.brand?.name || aircraft.customBrand;
  const displayModel = aircraft.model?.name || aircraft.customModel;
  const displaySubModel = aircraft.subModel?.name;
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
              {aircraft.images.slice(0, 3).map((img: any, idx: number) => (
                <div key={img.id || idx} className="h-36 relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
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

        <PrintSections sections={sections} />

        {aircraft.description && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-xs">
            <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1 mb-1.5 border-slate-100">Descripción</h3>
            <p className="whitespace-pre-line text-slate-700">{aircraft.description}</p>
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

      {/* VISTA WEB NORMAL */}
      <main className="container flex flex-col gap-10 mx-auto px-4 py-8 print:hidden">
        <section className="flex flex-col lg:flex-row items-start gap-8">
          <div className="w-full lg:w-2/3 flex flex-col gap-8">
            <AircraftGallery images={aircraft.images} title={aircraft.title} />
            {/* Descripción */}
              {aircraft.description && (
                <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm mt-2">
                  <h2 className="text-xl font-bold mb-3 text-[#001F58]">Descripción General</h2>
                  <p className="whitespace-pre-line text-slate-700 text-sm leading-relaxed">{aircraft.description}</p>
                </div>
              )}

            {/* BLOQUES VISIBLES SOLO EN MÓVIL (<lg) */}
            <div className="flex flex-col gap-5 lg:hidden">
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
                <PublishedLine createdAt={aircraft.createdAt} location={listingLocation} />

                <PlaneActionsHeader title={aircraft.title} aircraftId={aircraft.id} isFavoriteInitial={isFavoriteInitial} />
                <Separator />

                <div>
                  <h1 className="text-xl font-bold text-[#001F58]">{aircraft.title}</h1>
                  <h3 className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">{formattedPrice}</h3>
                </div>

                <Separator />

                <div className="space-y-1 text-sm text-slate-700">
                  <h4 className="font-bold text-[#001F58] mb-2">Datos de la aeronave</h4>
                  {displayBrand && <p><span className="font-semibold text-slate-500">Marca:</span> {displayBrand}</p>}
                  {displayModel && <p><span className="font-semibold text-slate-500">Modelo:</span> {displayModel}</p>}
                  {displaySubModel && <p><span className="font-semibold text-slate-500">Variante:</span> {displaySubModel}</p>}
                  <p><span className="font-semibold text-slate-500">Año:</span> {aircraft.year}</p>
                  <p><span className="font-semibold text-slate-500">Horas totales:</span> {hoursText}</p>

                  {/* Motor único en lateral móvil */}
                  {hasSingleEngine && singleEngine && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      <p className="font-bold text-[#001F58]">Motor</p>
                      {aircraft.engineType && <p><span className="font-semibold text-slate-500">Tipo:</span> {ENGINE_LABELS[aircraft.engineType]}</p>}
                      {singleEngine.TBO != null && <p><span className="font-semibold text-slate-500">TBO:</span> {tboText(singleEngine.TBO)}</p>}
                      {singleEngine.horsepower != null && <p><span className="font-semibold text-slate-500">Potencia:</span> {singleEngine.horsepower} HP</p>}
                      {singleEngine.engineHours != null && <p><span className="font-semibold text-slate-500">Horas Motor:</span> {singleEngine.engineHours.toLocaleString("es-AR")} hs</p>}
                      {singleEngine.DURG != null && <p><span className="font-semibold text-slate-500">DURG / SMOH:</span> {singleEngine.DURG.toLocaleString("es-AR")} hs</p>}
                      {singleEngine.brand && <p><span className="font-semibold text-slate-500">Marca:</span> {singleEngine.brand}</p>}
                      {singleEngine.model && <p><span className="font-semibold text-slate-500">Modelo:</span> {singleEngine.model}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Vendedor y Contacto */}
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#001F58]">Vendedor</h4>
                  <a className="text-xs font-semibold text-blue-600 hover:underline" href={`/profile/${seller.id}`}>Ver perfil</a>
                </div>

                <div className="flex items-center gap-3">
                  {seller.image ? (
                    <AppImage className="rounded-full w-12 h-12 object-cover border border-slate-200" src={seller.image} alt={seller.name || "Foto de vendedor"} width={48} height={48} optimizedWidth={100} />
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
                  entityId={aircraft.id} 
                  entityType="AIRCRAFT" 
                />
              </div>
            </div>

            {/* VA-57: características con íconos + tablas una debajo de la otra */}
            <FeaturesCard title="Características de la aeronave" features={features} />
            <DetailSections sections={sections} />

            {/* Documentación Adjunta (Para móvil) */}
            {aircraft.documents.length > 0 && (
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-3 lg:hidden mt-2">
                <h4 className="font-bold text-[#001F58] text-sm">Documentación Adjunta</h4>
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

          {/* Columna Derecha (DESKTOP >= lg) */}
          <div className="hidden lg:flex w-1/3 flex-col gap-5">
            <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <PublishedLine createdAt={aircraft.createdAt} location={listingLocation} />

              <PlaneActionsHeader title={aircraft.title} aircraftId={aircraft.id} isFavoriteInitial={isFavoriteInitial} />

              <Separator />

              <div>
                <p className="text-xl font-bold text-[#001F58]">{aircraft.title}</p>
                <h3 className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">{formattedPrice}</h3>
              </div>

              <Separator />

              <div className="space-y-1 text-sm text-slate-700">
                <h4 className="font-bold text-[#001F58] mb-2">Datos de la aeronave</h4>
                {displayBrand && <p><span className="font-semibold text-slate-500">Marca:</span> {displayBrand}</p>}
                {displayModel && <p><span className="font-semibold text-slate-500">Modelo:</span> {displayModel}</p>}
                {displaySubModel && <p><span className="font-semibold text-slate-500">Variante:</span> {displaySubModel}</p>}
                <p><span className="font-semibold text-slate-500">Año:</span> {aircraft.year}</p>
                <p><span className="font-semibold text-slate-500">Horas totales:</span> {hoursText}</p>

                {/* Motor Único en Lateral */}
                {hasSingleEngine && singleEngine && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    <p className="font-bold text-[#001F58]">Motor</p>
                    {aircraft.engineType && <p><span className="font-semibold text-slate-500">Tipo:</span> {ENGINE_LABELS[aircraft.engineType]}</p>}
                    {singleEngine.TBO != null && <p><span className="font-semibold text-slate-500">TBO:</span> {tboText(singleEngine.TBO)}</p>}
                    {singleEngine.horsepower != null && <p><span className="font-semibold text-slate-500">Potencia:</span> {singleEngine.horsepower} HP</p>}
                      {singleEngine.engineHours != null && <p><span className="font-semibold text-slate-500">Horas Motor:</span> {singleEngine.engineHours.toLocaleString("es-AR")} hs</p>}
                    {singleEngine.DURG != null && <p><span className="font-semibold text-slate-500">DURG / SMOH:</span> {singleEngine.DURG.toLocaleString("es-AR")} hs</p>}
                    {singleEngine.brand && <p><span className="font-semibold text-slate-500">Marca:</span> {singleEngine.brand}</p>}
                    {singleEngine.model && <p><span className="font-semibold text-slate-500">Modelo:</span> {singleEngine.model}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Vendedor */}
            <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#001F58]">Vendedor</h4>
                <a className="text-xs font-semibold text-blue-600 hover:underline" href={`/profile/${seller.id}`}>Ver perfil</a>
              </div>

              <div className="flex items-center gap-3">
                {seller.image ? (
                  <AppImage className="rounded-full w-12 h-12 object-cover border border-slate-200" src={seller.image} alt={seller.name || "Foto de vendedor"} width={48} height={48} optimizedWidth={100} />
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
                entityId={aircraft.id} 
                entityType="AIRCRAFT" 
              />
            </div>

            {/* Documentación Adjunta (Desktop) */}
            {aircraft.documents.length > 0 && (
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-3">
                <h4 className="font-bold text-[#001F58] text-sm">Documentación Adjunta</h4>
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