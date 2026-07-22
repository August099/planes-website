import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default async function PublicVendorProfilePage({
  params,
}: {
  params: { id: string };
}) {
  /*const seller = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      location: true,
      isVerified: true,
      createdAt: true,
    },
  });

  if (!seller) {
    notFound();
  }

  // Obtener publicaciones activas del vendedor (usando sellerId o user.id según tu schema)
  const listings = await prisma.aircraft.findMany({
    where: {
      OR: [
        { userId: seller.id },
        { sellerId: seller.id },
      ] as any, // Mantiene compatibilidad técnica independientemente del campo exacto en tu schema
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  // Asegurar que el número de WhatsApp se procese correctamente como string
  const whatsappNumber = seller.whatsapp ? String(seller.whatsapp).replace(/[^0-9]/g, "") : null;
*/
  return <></>/*(
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      <Image
        src="/bkg-plans.jpg"
        alt="Fondo Vendedor"
        fill
        priority
        className="-z-20 object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-background/85 backdrop-blur-[2px]" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-6xl">
        
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-[#001F58]/15 shadow-sm mb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-[#001F58] text-white flex items-center justify-center font-bold text-3xl shadow-md uppercase">
                {seller.name ? seller.name.charAt(0) : "V"}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#001F58]">
                    {seller.name || "Vendedor Aeronáutico"}
                  </h1>
                  {seller.isVerified && (
                    <Badge className="bg-blue-100 text-blue-900 border-blue-200">
                      ✓ Vendedor Verificado
                    </Badge>
                  )}
                </div>

                {seller.location && (
                  <p className="text-sm font-medium text-[#001F58]/70 flex items-center gap-1 mb-2">
                    📍 {seller.location}
                  </p>
                )}

                <p className="text-xs text-[#001F58]/60">
                  Miembro desde {new Date(seller.createdAt).getFullYear()} &bull; {listings.length} aviso{listings.length !== 1 ? "s" : ""} activo{listings.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-none text-center px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-sm"
                >
                  💬 Contactar por WhatsApp
                </a>
              )}

              {seller.phone && (
                <a
                  href={`tel:${seller.phone}`}
                  className="flex-1 md:flex-none text-center px-5 py-3 rounded-xl bg-[#001F58] hover:bg-[#001F58]/90 text-white font-medium text-sm transition-all shadow-sm"
                >
                  📞 Llamar
                </a>
              )}
            </div>
          </div>
        </div>

       
        <div>
          <h2 className="font-heading font-bold text-2xl text-[#001F58] mb-6">
            Publicaciones de este Vendedor
          </h2>

          {listings.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-12 text-center border border-[#001F58]/15">
              <p className="text-base font-semibold text-[#001F58]">
                Este vendedor no tiene publicaciones activas en este momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/publicacion/${item.id}`}
                  className="group bg-white/80 backdrop-blur-md border border-[#001F58]/15 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
               
                    <div className="relative w-full h-48 bg-slate-100">
                      {item.images?.[0] ? (
                        <Image
                          src={item.images[0]}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#001F58]/40 font-bold">
                          SIN FOTO
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="font-heading font-bold text-base text-[#001F58] group-hover:text-[#E70F1F] transition-colors mb-2 line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="font-heading text-xl font-extrabold text-[#001F58]">
                        ${Number(item.price).toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-0">
                    <span className="block text-center w-full py-2.5 rounded-xl border border-[#001F58]/20 font-medium text-xs text-[#001F58] group-hover:bg-[#001F58] group-hover:text-white transition-all">
                      Ver Ficha Completa
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );*/
}