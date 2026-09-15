import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../../components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, FileText, MessageCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { DetailRow } from "@/components/ui/DetailRow";
import { QnaSection } from "@/components/ui/QnaSection";
import { PlaneActionsHeader } from "@/components/ui/PlaneActionsHeader";
import { AppImage } from "@/components/ui/AppImage";
import { auth } from "@/lib/auth";
import Link from "next/link";

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
      brand: true,
      model: true,
      subModel: true,
      category: true,
      questions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!aircraft) notFound();

  // VALIDACIÓN DE VENCIMIENTO / PAUSA
  const isOwner = session?.user?.id === aircraft.sellerId;
  const now = new Date();
  const isExpired = aircraft.listingExpiresAt ? new Date(aircraft.listingExpiresAt) < now : false;
  const isInactive = aircraft.status !== "ACTIVE" || isExpired;

  // Si no está activa/está vencida y el visitante NO es el dueño, se bloquea la vista
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

  // Registrar analítica (Solo para publicaciones activas)
  if (!isInactive) {
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

  const displayBrand = aircraft.brand?.name || aircraft.customBrand;
  const displayModel = aircraft.model?.name || aircraft.customModel;
  const displaySubModel = aircraft.subModel?.name;

  const sellerLocation = [seller.city, seller.province].filter(Boolean).join(", ");

  return (
    <>
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
          <img 
            src="/logo-full.png" 
            alt="Ventas Aeronáuticas" 
            className="h-14 w-auto object-contain mx-auto" 
          />
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
            <p className="text-xs text-slate-500 mt-0.5">
              Ubicación: {aircraft.city}, {aircraft.province}
            </p>
          </div>
          <span className="text-2xl font-black text-emerald-700 shrink-0">
            {formattedPrice}
          </span>
        </div>

        {aircraft.images.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-[#001F58] tracking-wider">
              Fotografías de la Aeronave
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {aircraft.images.slice(0, 3).map((img: any, idx: number) => (
                <div key={img.id || idx} className="h-36 relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                  <img src={img.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 pt-2">
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
              <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1.5 border-slate-100">
                Especificaciones Generales
              </h3>
              <div className="text-xs space-y-1.5 text-slate-700">
                {displayBrand && <p className="flex justify-between"><span className="font-semibold text-slate-500">Marca:</span> <span>{displayBrand}</span></p>}
                {displayModel && <p className="flex justify-between"><span className="font-semibold text-slate-500">Modelo:</span> <span>{displayModel}</span></p>}
                {displaySubModel && <p className="flex justify-between"><span className="font-semibold text-slate-500">Variante:</span> <span>{displaySubModel}</span></p>}
                {aircraft.category?.name && <p className="flex justify-between"><span className="font-semibold text-slate-500">Categoría:</span> <span>{aircraft.category.name}</span></p>}
                <p className="flex justify-between"><span className="font-semibold text-slate-500">Año:</span> <span>{aircraft.year}</span></p>
                {aircraft.totalTimeHours && <p className="flex justify-between"><span className="font-semibold text-slate-500">Horas Totales:</span> <span>{aircraft.totalTimeHours} hs</span></p>}
                <p className="flex justify-between"><span className="font-semibold text-slate-500">Condición:</span> <span>{aircraft.condition}</span></p>
                {aircraft.engineType && <p className="flex justify-between"><span className="font-semibold text-slate-500">Tipo Motor:</span> <span>{aircraft.engineType}</span></p>}
              </div>
            </div>

            {aircraft.engines.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1.5 border-slate-100">
                  Detalles de Planta Motriz
                </h3>
                {aircraft.engines.map((e: any, idx: number) => (
                  <div key={e.id || idx} className="text-xs space-y-1 text-slate-700 pb-2 border-b border-slate-50 last:border-0">
                    {aircraft.engines.length > 1 && <p className="font-bold text-[#001F58]">Motor {idx + 1}</p>}
                    <p className="flex justify-between"><span className="font-semibold text-slate-500">TBO:</span> <span>{e.TBO} hs</span></p>
                    {e.engineHours && <p className="flex justify-between"><span className="font-semibold text-slate-500">Horas Usadas:</span> <span>{e.engineHours} hs</span></p>}
                    {e.brand && <p className="flex justify-between"><span className="font-semibold text-slate-500">Marca:</span> <span>{e.brand}</span></p>}
                    {e.model && <p className="flex justify-between"><span className="font-semibold text-slate-500">Modelo:</span> <span>{e.model}</span></p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {(aircraft.financing || aircraft.trade || aircraft.rent) && (
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1.5 border-slate-100">
                  Opciones de Negociación
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {aircraft.financing && (
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-[10px] font-bold">
                      Acepta Financiación
                    </span>
                  )}
                  {aircraft.trade && (
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-bold">
                      Acepta Permuta
                    </span>
                  )}
                  {aircraft.rent && (
                    <span className="px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-bold">
                      Disponible para Alquiler
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1.5 border-slate-200">
                Contacto del Vendedor
              </h3>
              <div className="text-xs space-y-1.5 text-slate-700">
                <p className="flex justify-between"><span className="font-semibold text-slate-500">Nombre / Razón Social:</span> <span className="font-bold">{seller.name}</span></p>
                {sellerLocation && <p className="flex justify-between"><span className="font-semibold text-slate-500">Ubicación:</span> <span>{sellerLocation}</span></p>}
                {seller.phone && <p className="flex justify-between"><span className="font-semibold text-slate-500">Teléfono:</span> <span>{seller.phone}</span></p>}
                {seller.email && <p className="flex justify-between"><span className="font-semibold text-slate-500">Email:</span> <span>{seller.email}</span></p>}
              </div>
            </div>

            {aircraft.description && (
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1.5 border-slate-100">
                  Descripción
                </h3>
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {aircraft.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 text-center space-y-1">
          <p className="text-[11px] font-bold text-[#001F58]">
            Ventas Aeronáuticas — Marketplace de Aviones y Repuestos
          </p>
          <p className="text-[10px] text-slate-500">
            Ver publicación en línea: <span className="underline font-medium text-blue-800">{`https://ventasaeronauticas.com/planes/plane-details/${aircraft.id}`}</span>
          </p>
        </div>
      </div>

      {/* VISTA WEB NORMAL */}
      <main className="container flex flex-col gap-10 mx-auto px-4 py-8 print:hidden">
        <section className="flex flex-col lg:flex-row items-start gap-8">
          <div className="w-full lg:w-2/3 flex flex-col gap-8">
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
                  {displayBrand && <p><span className="font-semibold text-slate-500">Marca:</span> {displayBrand}</p>}
                  {displayModel && <p><span className="font-semibold text-slate-500">Modelo:</span> {displayModel}</p>}
                  {displaySubModel && <p><span className="font-semibold text-slate-500">Variante:</span> {displaySubModel}</p>}
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
                    <AppImage
                      className="rounded-full w-12 h-12 object-cover border border-slate-200"
                      src={seller.image}
                      alt={seller.name || "Foto de vendedor"}
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

            {/* Ficha Técnica */}
            <section className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-[#001F58]">Información Adicional</h2>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">Aeronave</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  {displayBrand && <DetailRow label="Marca" value={displayBrand} />}
                  {displayModel && <DetailRow label="Modelo" value={displayModel} />}
                  {displaySubModel && <DetailRow label="Variante / Submodelo" value={displaySubModel} />}
                  {aircraft.category?.name && <DetailRow label="Categoría" value={aircraft.category.name} />}
                  <DetailRow label="Ubicación" value={`${aircraft.city}, ${aircraft.province}`} />
                  <DetailRow label="Condición" value={aircraft.condition} />
                  {aircraft.engineType && <DetailRow label="Tipo de Motor" value={aircraft.engineType} />}
                  {aircraft.year && <DetailRow label="Año" value={aircraft.year} />}
                  {aircraft.totalTimeHours && <DetailRow label="Horas Totales" value={`${aircraft.totalTimeHours} hs`} />}
                </div>
              </div>

              {/* Opciones de Negociación */}
              {(aircraft.financing || aircraft.trade || aircraft.rent) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-800">Opciones de Negociación</h3>
                  <div className="flex flex-wrap gap-2">
                    {aircraft.financing && (
                      <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                        Acepta Financiación
                      </span>
                    )}
                    {aircraft.trade && (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                        Acepta Permuta
                      </span>
                    )}
                    {aircraft.rent && (
                      <span className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold">
                        Disponible para Alquiler
                      </span>
                    )}
                  </div>
                </div>
              )}

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
                {displayBrand && <p><span className="font-semibold text-slate-500">Marca:</span> {displayBrand}</p>}
                {displayModel && <p><span className="font-semibold text-slate-500">Modelo:</span> {displayModel}</p>}
                {displaySubModel && <p><span className="font-semibold text-slate-500">Variante:</span> {displaySubModel}</p>}
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
                  <AppImage
                    className="rounded-full w-12 h-12 object-cover border border-slate-200"
                    src={seller.image}
                    alt={seller.name || "Foto de vendedor"}
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