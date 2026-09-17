import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "@/components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { DetailRow } from "@/components/ui/DetailRow";
import { QnaSection } from "@/components/ui/QnaSection";
import { PlaneActionsHeader } from "@/components/ui/PlaneActionsHeader";
import { AppImage } from "@/components/ui/AppImage";
import { auth } from "@/lib/auth";
import { ContactButtons } from "@/components/ui/ContactButtons";

export default async function SparePartDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const sparePart = await prisma.sparePart.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      category: {
        include: {
          parent: true,
        },
      },
      questions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

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

  // Registrar evento analítico
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: "SPARE_PART_VIEW",
        sparePartId: sparePart.id,
        userId: session?.user?.id ?? null,
      },
    });
  } catch (err) {
    console.error("Error al registrar analítica:", err);
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

  // Atributos dinámicos del JSON de la subcategoría
  const attributesObj = (sparePart.attributes as Record<string, any>) || {};
  const attributeEntries = Object.entries(attributesObj);

  // Lista de aeronaves compatibles si existen
  const compatibleAircrafts = Array.isArray(sparePart.aircrafts) ? (sparePart.aircrafts as string[]) : [];

  return (
    <>
      {/* VISTA DE IMPRESIÓN / PDF */}
      <div className="hidden print:block font-sans text-black p-4 space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-end border-b-2 border-black pb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              Ventas Aeronáuticas
            </h1>
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

        <div className="grid grid-cols-2 gap-8 text-xs border-t border-b border-slate-300 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Datos del Repuesto
              </h3>
              <div className="space-y-1">
                {sparePart.brand && <p><span className="font-semibold">Marca:</span> {sparePart.brand}</p>}
                {sparePart.condition && <p><span className="font-semibold">Condición:</span> {sparePart.condition}</p>}
                {sparePart.category?.parent?.name && <p><span className="font-semibold">Categoría:</span> {sparePart.category.parent.name}</p>}
                {sparePart.category?.name && <p><span className="font-semibold">Subcategoría:</span> {sparePart.category.name}</p>}
                <p><span className="font-semibold">Stock:</span> {sparePart.stock} {sparePart.stock === 1 ? "unidad" : "unidades"}</p>
                {sparePart.partNumber && <p><span className="font-semibold">Número de Parte (P/N):</span> {sparePart.partNumber}</p>}
                <p><span className="font-semibold">Ubicación:</span> {locationText}</p>
                {attributeEntries.map(([key, val]) => (
                  <p key={key}><span className="font-semibold">{key}:</span> {String(val)}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Datos del Vendedor
              </h3>
              <div className="space-y-1">
                <p><span className="font-semibold">Nombre:</span> {seller.name}</p>
                {sellerLocation && <p><span className="font-semibold">Ubicación:</span> {sellerLocation}</p>}
                {seller.phone && <p><span className="font-semibold">Teléfono:</span> {seller.phone}</p>}
                {seller.email && <p><span className="font-semibold">Email:</span> {seller.email}</p>}
              </div>
            </div>

            {sparePart.description && (
              <div>
                <h3 className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                  Descripción
                </h3>
                <p className="text-slate-700 leading-snug whitespace-pre-line text-[11px]">
                  {sparePart.description}
                </p>
              </div>
            )}
          </div>
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
            <AircraftGallery images={sparePart.images} />

            {/* 2. DESCRIPCIÓN GENERAL (Ubicada inmediatamente debajo de las imágenes) */}
            {sparePart.description && (
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm">
                <h1 className="text-xl font-bold mb-3 text-[#001F58]">Descripción General</h1>
                <p className="whitespace-pre-line text-slate-700 text-sm leading-relaxed">
                  {sparePart.description}
                </p>
              </div>
            )}

            {/* BLOQUES VISIBLES SOLO EN MÓVIL (<lg) */}
            <div className="flex flex-col gap-5 lg:hidden">
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-100">
                  <p>Publicado el {sparePart.createdAt.toLocaleDateString("es-AR")}</p>
                </div>

                <PlaneActionsHeader
                  title={sparePart.title}
                  aircraftId={sparePart.id}
                  isFavoriteInitial={isFavoriteInitial}
                />

                <Separator />

                <div>
                  <h2 className="text-xl font-bold text-[#001F58]">{sparePart.title}</h2>
                  <h3 className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">
                    {formattedPrice}
                  </h3>
                </div>

                <Separator />

                {/* DETALLES PRINCIPALES MÓVIL */}
                <div className="space-y-1 text-sm text-slate-700">
                  <h4 className="font-bold text-[#001F58] mb-2">Detalles principales</h4>
                  {sparePart.brand && (
                    <p><span className="font-semibold text-slate-500">Marca:</span> {sparePart.brand}</p>
                  )}
                  {sparePart.condition && (
                    <p><span className="font-semibold text-slate-500">Condición:</span> {sparePart.condition}</p>
                  )}
                  {sparePart.category?.parent?.name && (
                    <p><span className="font-semibold text-slate-500">Categoría:</span> {sparePart.category.parent.name}</p>
                  )}
                  {sparePart.category?.name && (
                    <p><span className="font-semibold text-slate-500">Subcategoría:</span> {sparePart.category.name}</p>
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

            {/* Ficha Técnica / Información Adicional */}
            <section className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-[#001F58]">Información Adicional</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Columna 1: Especificaciones principales */}
                <div className="space-y-6">
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    {sparePart.brand && <DetailRow label="Marca / Fabricante" value={sparePart.brand} />}
                    {sparePart.condition && <DetailRow label="Condición" value={sparePart.condition} />}
                    {sparePart.partNumber && (
                      <DetailRow label="Número de Parte (P/N)" value={sparePart.partNumber} />
                    )}
                    <DetailRow label="Stock Disponible" value={`${sparePart.stock} ${sparePart.stock === 1 ? "unidad" : "unidades"}`} />
                    <DetailRow label="Ubicación" value={locationText} />

                    {/* Renderizar dinámicamente todos los campos/atributos del JSON */}
                    {attributeEntries.map(([key, val]) => (
                      <DetailRow key={key} label={key} value={String(val)} />
                    ))}
                  </div>
                </div>

                {/* Columna 2: Aeronaves compatibles y Categoría */}
                <div className="space-y-6">
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    {sparePart.category?.parent?.name && (
                      <DetailRow label="Categoría" value={sparePart.category.parent.name} />
                    )}
                    {sparePart.category?.name && (
                      <DetailRow label="Subcategoría" value={sparePart.category.name} />
                    )}
                  </div>

                  {/* Aeronaves Compatibles en Chips Azules */}
                  {compatibleAircrafts.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-800">Aeronaves Compatibles</h3>
                      <div className="flex flex-wrap gap-2">
                        {compatibleAircrafts.map((modelName, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[#001F58] text-xs font-semibold"
                          >
                            {modelName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </section>
          </div>

          {/* Columna Derecha (DESKTOP >= lg) - Flujo continuo sin sticky */}
          <div className="hidden lg:flex w-1/3 flex-col gap-5">
            <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-100">
                <p>Publicado el {sparePart.createdAt.toLocaleDateString("es-AR")}</p>
              </div>

              <PlaneActionsHeader
                title={sparePart.title}
                aircraftId={sparePart.id}
                isFavoriteInitial={isFavoriteInitial}
              />

              <Separator />

              <div>
                <h2 className="text-xl font-bold text-[#001F58]">{sparePart.title}</h2>
                <h3 className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">
                  {formattedPrice}
                </h3>
              </div>

              <Separator />

              <div className="space-y-1 text-sm text-slate-700">
                <h4 className="font-bold text-[#001F58] mb-2">Detalles principales</h4>
                {sparePart.brand && (
                  <p><span className="font-semibold text-slate-500">Marca:</span> {sparePart.brand}</p>
                )}
                {sparePart.condition && (
                  <p><span className="font-semibold text-slate-500">Condición:</span> {sparePart.condition}</p>
                )}
                {sparePart.category?.parent?.name && (
                  <p><span className="font-semibold text-slate-500">Categoría:</span> {sparePart.category.parent.name}</p>
                )}
                {sparePart.category?.name && (
                  <p><span className="font-semibold text-slate-500">Subcategoría:</span> {sparePart.category.name}</p>
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
                entityType="AIRCRAFT" 
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