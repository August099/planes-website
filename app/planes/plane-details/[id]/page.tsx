import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../../components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, FileText, MessageCircle } from "lucide-react";
import { DetailRow } from "@/components/ui/DetailRow";
import { QnaSection } from "@/components/ui/QnaSection";
import { PlaneActionsHeader } from "@/components/ui/PlaneActionsHeader";
import { auth } from "@/lib/auth";

export default async function PlaneDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const aircraft = await prisma.aircraft.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      engines: true,
      propeller: true,
      documents: true,
      questions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!aircraft) notFound();

  const seller = await prisma.user.findUnique({
    where: { id: aircraft.sellerId },
  });

  if (!seller) notFound();

  // Comprobar si la publicación está guardada en los favoritos del usuario actual
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

  // Registrar analítica
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: "AIRCRAFT_VIEW",
        aircraftId: aircraft.id,
        userId: session?.user?.id ?? null,
      },
    });
  } catch (err) {
    console.error("Error al registrar analítica:", err);
  }

  const subject = encodeURIComponent(`Consulta por avión ${aircraft.title}`);
  const body = encodeURIComponent(
    `Hola, estoy interesado en el avión "${aircraft.title}" publicado en Ventas Aeronáuticas.`
  );

  const cleanPhone = seller.phone ? seller.phone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${body}`
    : null;

  const hasSingleEngine = aircraft.engines.length === 1;
  const hasMultipleEngines = aircraft.engines.length > 1;

  const hasSinglePropeller = aircraft.propeller.length === 1;
  const hasMultiplePropellers = aircraft.propeller.length > 1;

  const singleEngine = hasSingleEngine ? aircraft.engines[0] : null;
  const singlePropeller = hasSinglePropeller ? aircraft.propeller[0] : null;

  const formattedPrice = aircraft.price
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(aircraft.price))
    : "Consultar precio";

  return (
    <>
      {/* VISTA DE IMPRESIÓN / PDF */}
      <div className="hidden print:block font-sans text-black p-4 space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-end border-b-2 border-black pb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              Ventas Aeronáuticas
            </h1>
            <p className="text-xs text-slate-500">Ficha Técnica de Publicación</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">Publicado el {aircraft.createdAt.toLocaleDateString("es-AR")}</p>
            <p className="text-slate-500">ID Ref: {aircraft.id.slice(-6).toUpperCase()}</p>
          </div>
        </div>

        <div className="flex justify-between items-start gap-4">
          <h2 className="text-2xl font-black text-black">{aircraft.title}</h2>
          <span className="text-2xl font-black text-slate-900 shrink-0">
            {formattedPrice}
          </span>
        </div>

        {aircraft.images[0] && (
          <div className="w-full h-[380px] bg-slate-100 border border-slate-300 rounded-lg overflow-hidden my-4">
            <img
              src={aircraft.images[0].url}
              alt={aircraft.title}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 text-xs border-t border-b border-slate-300 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Datos de la Aeronave
              </h3>
              <div className="space-y-1">
                <p><span className="font-semibold">Año:</span> {aircraft.year}</p>
                {aircraft.totalTimeHours && <p><span className="font-semibold">Horas Totales:</span> {aircraft.totalTimeHours} hs</p>}
                <p><span className="font-semibold">Condición:</span> {aircraft.condition}</p>
                <p><span className="font-semibold">Ubicación:</span> {aircraft.city}, {aircraft.province}</p>
                {aircraft.engineType && <p><span className="font-semibold">Tipo de Motor:</span> {aircraft.engineType}</p>}
              </div>
            </div>

            {aircraft.engines.length > 0 && (
              <div>
                <h3 className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                  Detalles del Motor
                </h3>
                {aircraft.engines.map((e, idx) => (
                  <div key={e.id} className="space-y-1 mb-2">
                    {aircraft.engines.length > 1 && <p className="font-bold text-slate-600">Motor {idx + 1}</p>}
                    <p><span className="font-semibold">TBO:</span> {e.TBO}</p>
                    {e.engineHours && <p><span className="font-semibold">Horas:</span> {e.engineHours} hs</p>}
                    {e.brand && <p><span className="font-semibold">Marca:</span> {e.brand}</p>}
                    {e.model && <p><span className="font-semibold">Modelo:</span> {e.model}</p>}
                  </div>
                ))}
              </div>
            )}

            {aircraft.propeller.length > 0 && (
              <div>
                <h3 className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                  Detalles de Hélice
                </h3>
                {aircraft.propeller.map((p, idx) => (
                  <div key={p.id} className="space-y-1 mb-2">
                    {aircraft.propeller.length > 1 && <p className="font-bold text-slate-600">Hélice {idx + 1}</p>}
                    {p.propellerHours && <p><span className="font-semibold">Horas:</span> {p.propellerHours} hs</p>}
                    {p.model && <p><span className="font-semibold">Modelo:</span> {p.model}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Datos del Vendedor
              </h3>
              <div className="space-y-1">
                <p><span className="font-semibold">Nombre:</span> {seller.name}</p>
                <p><span className="font-semibold">Ubicación:</span> {aircraft.city}, {aircraft.province}</p>
                {seller.phone && <p><span className="font-semibold">Teléfono:</span> {seller.phone}</p>}
                {seller.email && <p><span className="font-semibold">Email:</span> {seller.email}</p>}
              </div>
            </div>

            {aircraft.description && (
              <div>
                <h3 className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                  Descripción
                </h3>
                <p className="text-slate-700 leading-snug whitespace-pre-line text-[11px]">
                  {aircraft.description}
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
            {/* 1. Imágenes */}
            <AircraftGallery images={aircraft.images} />

            {/* BLOQUES VISIBLES SOLO EN MÓVIL (<lg) */}
            <div className="flex flex-col gap-5 lg:hidden">
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-100">
                  <p>Publicado el {aircraft.createdAt.toLocaleDateString("es-AR")}</p>
                </div>

                <PlaneActionsHeader
                  title={aircraft.title}
                  aircraftId={aircraft.id}
                  isFavoriteInitial={isFavoriteInitial}
                />

                <Separator />

                <div>
                  <h2 className="text-xl font-bold text-[#001F58]">{aircraft.title}</h2>
                  <h3 className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">
                    {formattedPrice}
                  </h3>
                </div>

                <Separator />

                <div className="space-y-1 text-sm text-slate-700">
                  <h4 className="font-bold text-[#001F58] mb-2">Datos de la aeronave</h4>
                  <p><span className="font-semibold text-slate-500">Año:</span> {aircraft.year}</p>
                  {aircraft.totalTimeHours && (
                    <p><span className="font-semibold text-slate-500">Horas totales:</span> {aircraft.totalTimeHours} hs</p>
                  )}

                  {hasSingleEngine && singleEngine && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      <p className="font-bold text-[#001F58]">Motor</p>
                      <p><span className="font-semibold text-slate-500">TBO:</span> {singleEngine.TBO}</p>
                      {singleEngine.engineHours && <p><span className="font-semibold text-slate-500">Horas Motor:</span> {singleEngine.engineHours} hs</p>}
                      {singleEngine.brand && <p><span className="font-semibold text-slate-500">Marca:</span> {singleEngine.brand}</p>}
                      {singleEngine.model && <p><span className="font-semibold text-slate-500">Modelo:</span> {singleEngine.model}</p>}
                    </div>
                  )}

                  {hasSinglePropeller && singlePropeller && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      <p className="font-bold text-[#001F58]">Hélice</p>
                      {singlePropeller.propellerHours && <p><span className="font-semibold text-slate-500">Horas Hélice:</span> {singlePropeller.propellerHours} hs</p>}
                      {singlePropeller.model && <p><span className="font-semibold text-slate-500">Modelo:</span> {singlePropeller.model}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Vendedor y Contacto */}
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
                    <img
                      className="rounded-full w-12 h-12 object-cover border border-slate-200"
                      src={seller.image}
                      alt={seller.name || "Foto de vendedor"}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg border border-slate-200">
                      {seller.name?.charAt(0).toUpperCase() || "V"}
                    </div>
                  )}
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{seller.name}</h5>
                    <p className="text-xs text-slate-500">{`${aircraft.city}, ${aircraft.province}`}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {seller.phone && (
                    <div className="flex gap-2">
                      <a
                        href={`tel:${seller.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-xl transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        Llamar
                      </a>

                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-500 text-white hover:bg-emerald-600 font-semibold text-xs rounded-xl transition-colors shadow-xs"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  {seller.email && (
                    <a
                      href={`mailto:${seller.email}?subject=${subject}&body=${body}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-colors"
                    >
                      <Mail className="w-4 h-4 text-slate-500" />
                      Enviar Correo
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Descripción */}
            {aircraft.description && (
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm">
                <h1 className="text-xl font-bold mb-3 text-[#001F58]">Descripción</h1>
                <p className="whitespace-pre-line text-slate-700 text-sm leading-relaxed">
                  {aircraft.description}
                </p>
              </div>
            )}

            {/* Ficha Técnica e Información Adicional */}
            <section className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-[#001F58]">Información Adicional</h2>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">Aeronave</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <DetailRow label="Provincia" value={aircraft.province} />
                  <DetailRow label="Ciudad" value={aircraft.city} />
                  <DetailRow label="Condición" value={aircraft.condition} />
                  {aircraft.engineType && <DetailRow label="Tipo de Motor" value={aircraft.engineType} />}
                </div>
              </div>

              {hasMultipleEngines && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800">Motores</h3>
                  {aircraft.engines.map((engine, index) => (
                    <div key={engine.id} className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-600">Motor {index + 1}</h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <DetailRow label="TBO" value={engine.TBO} />
                        {engine.engineHours && <DetailRow label="Horas totales" value={engine.engineHours} />}
                        {engine.brand && <DetailRow label="Marca" value={engine.brand} />}
                        {engine.model && <DetailRow label="Modelo" value={engine.model} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasMultiplePropellers && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800">Hélices</h3>
                  {aircraft.propeller.map((p, index) => (
                    <div key={p.id} className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-600">Hélice {index + 1}</h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        {p.propellerHours && <DetailRow label="Horas totales" value={p.propellerHours} />}
                        {p.model && <DetailRow label="Modelo" value={p.model} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(aircraft.customModel) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-800">Detalles Específicos</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    {aircraft.customModel && <DetailRow label="Modelo Personalizado" value={aircraft.customModel} />}
                  </div>
                </div>
              )}
            </section>

            {/* Documentación Adjunta (Para móvil) */}
            {aircraft.documents.length > 0 && (
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-3 lg:hidden">
                <h4 className="font-bold text-[#001F58] text-sm">Documentación Adjunta</h4>
                <div className="space-y-2">
                  {aircraft.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition-colors w-full group"
                    >
                      <FileText className="w-7 h-7 text-red-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-[#001F58] truncate">
                        {doc.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha (DESKTOP >= lg) */}
          <div className="hidden lg:flex w-1/3 flex-col gap-5">
            <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-100">
                <p>Publicado el {aircraft.createdAt.toLocaleDateString("es-AR")}</p>
              </div>

              <PlaneActionsHeader
                title={aircraft.title}
                aircraftId={aircraft.id}
                isFavoriteInitial={isFavoriteInitial}
              />

              <Separator />

              <div>
                <h2 className="text-xl font-bold text-[#001F58]">{aircraft.title}</h2>
                <h3 className="text-[var(--sidebar-primary)] text-2xl font-black mt-2">
                  {formattedPrice}
                </h3>
              </div>

              <Separator />

              <div className="space-y-1 text-sm text-slate-700">
                <h4 className="font-bold text-[#001F58] mb-2">Datos de la aeronave</h4>
                <p><span className="font-semibold text-slate-500">Año:</span> {aircraft.year}</p>
                {aircraft.totalTimeHours && (
                  <p><span className="font-semibold text-slate-500">Horas totales:</span> {aircraft.totalTimeHours} hs</p>
                )}

                {hasSingleEngine && singleEngine && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    <p className="font-bold text-[#001F58]">Motor</p>
                    <p><span className="font-semibold text-slate-500">TBO:</span> {singleEngine.TBO}</p>
                    {singleEngine.engineHours && <p><span className="font-semibold text-slate-500">Horas Motor:</span> {singleEngine.engineHours} hs</p>}
                    {singleEngine.brand && <p><span className="font-semibold text-slate-500">Marca:</span> {singleEngine.brand}</p>}
                    {singleEngine.model && <p><span className="font-semibold text-slate-500">Modelo:</span> {singleEngine.model}</p>}
                  </div>
                )}

                {hasSinglePropeller && singlePropeller && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    <p className="font-bold text-[#001F58]">Hélice</p>
                    {singlePropeller.propellerHours && <p><span className="font-semibold text-slate-500">Horas Hélice:</span> {singlePropeller.propellerHours} hs</p>}
                    {singlePropeller.model && <p><span className="font-semibold text-slate-500">Modelo:</span> {singlePropeller.model}</p>}
                  </div>
                )}
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
                  <img
                    className="rounded-full w-12 h-12 object-cover border border-slate-200"
                    src={seller.image}
                    alt={seller.name || "Foto de vendedor"}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg border border-slate-200">
                    {seller.name?.charAt(0).toUpperCase() || "V"}
                  </div>
                )}
                <div>
                  <h5 className="font-bold text-slate-800 text-sm">{seller.name}</h5>
                  <p className="text-xs text-slate-500">{`${aircraft.city}, ${aircraft.province}`}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {seller.phone && (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${seller.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-xl transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Llamar
                    </a>

                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-500 text-white hover:bg-emerald-600 font-semibold text-xs rounded-xl transition-colors shadow-xs"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                )}

                {seller.email && (
                  <a
                    href={`mailto:${seller.email}?subject=${subject}&body=${body}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-colors"
                  >
                    <Mail className="w-4 h-4 text-slate-500" />
                    Enviar Correo
                  </a>
                )}
              </div>
            </div>

            {/* Documentación Adjunta (Desktop) */}
            {aircraft.documents.length > 0 && (
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-3">
                <h4 className="font-bold text-[#001F58] text-sm">Documentación Adjunta</h4>
                <div className="space-y-2">
                  {aircraft.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition-colors w-full group"
                    >
                      <FileText className="w-7 h-7 text-red-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-[#001F58] truncate">
                        {doc.name}
                      </span>
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