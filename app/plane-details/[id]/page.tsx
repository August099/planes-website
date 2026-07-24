import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Heart, Share2, Printer, TriangleAlert } from "lucide-react";

export default async function PlaneDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const aircraft = await prisma.aircraft.findUnique({
    where: { id },
    include: { images: { orderBy: { order: "asc" } } },
  });

  if (!aircraft) {
    notFound()
  }

  const seller = await prisma.user.findUnique({
    where: { id: aircraft.sellerId },
  });

  if (!seller) {
    notFound()
  }

  const subject = encodeURIComponent(`Consulta por ${aircraft.model}`);
  const body = encodeURIComponent(
    `Hola, estoy interesado en el avión ${aircraft.model} publicado en Ventas Aeronáuticas.`
  );



  return (
    <main className="container flex flex-col gap-10 mx-auto px-4 py-8">
      <section className="flex gap-6">
        <div className="w-2/3">
          <AircraftGallery images={aircraft.images} />
        </div>
        <div className="w-1/3 flex flex-col border-2 rounded-[10] bg-white p-5 gap-2">
          <div className="w-full flex justify-between gap-3">
            <div className="w-full flex gap-3">
              <div className="group flex">
                <Heart className="cursor-pointer hover:text-red-600"/>
                <span
                  className="
                    ml-0
                    max-w-0
                    overflow-hidden
                    whitespace-nowrap
                    opacity-0
                    transition-all
                    duration-300
                    ease-out
                    group-hover:ml-2
                    group-hover:max-w-40
                    group-hover:opacity-100
                  "
                >
                  Favoritos
                </span>
              </div>
              <div className="group flex">
                <Share2 className="cursor-pointer hover:text-blue-600"/>
                <span
                  className="
                    ml-0
                    max-w-0
                    overflow-hidden
                    whitespace-nowrap
                    opacity-0
                    transition-all
                    duration-300
                    ease-out
                    group-hover:ml-2
                    group-hover:max-w-40
                    group-hover:opacity-100
                  "
                >
                  Compartir
                </span>
              </div>
              <div className="group flex">
                <Printer className="cursor-pointer hover:text-blue-600"/>
                <span
                  className="
                    ml-0
                    max-w-0
                    overflow-hidden
                    whitespace-nowrap
                    opacity-0
                    transition-all
                    duration-300
                    ease-out
                    group-hover:ml-2
                    group-hover:max-w-40
                    group-hover:opacity-100
                  "
                >
                  Imprimir
                </span>
              </div>
            </div>
            <div className="group flex">
              <span
                className="
                  mr-0
                  max-w-0
                  overflow-hidden
                  whitespace-nowrap
                  opacity-0
                  transition-all
                  duration-300
                  ease-out
                  group-hover:mr-2
                  group-hover:max-w-40
                  group-hover:opacity-100
                "
              >
                Reportar
              </span>
              <TriangleAlert className="text-red-600 cursor-pointer"/>
            </div>
          </div>

          <Separator className="my-4" />
            <h4><b>{aircraft.title}</b></h4>
            <h3 className="ml-2"><b>Precio:</b> {aircraft.price ? `$${aircraft.price}` : "A consultar"}</h3>
            <h3 className="ml-2"><b>Horas totales:</b> {aircraft.totalTimeHours}</h3>
            <h3 className="ml-2"><b>año:</b> {aircraft.year}</h3>
          <Separator className="my-4" />

          <h1><b>Datos del vendedor</b></h1>
          <h3 className="ml-2"><b>Vendedor:</b> {seller.name}</h3>
          <h3 className="ml-2"><b>Provincia:</b> {aircraft.province}</h3>
          <h3 className="ml-2"><b>Ciudad:</b> {aircraft.city}</h3>
          <a className="w-min text-nowrap ml-2" href={`/profile/${seller.id}`}>{seller.image && <img src={seller.image} alt="Foto de perfil" />} Ver perfil</a>
          <Separator className="my-4" />

          <h1><b>Contactos</b></h1>
          <div className="flex gap-2 ml-2">
            <Phone/ >
            <a href={`tel:${seller.phone}`} className="text-blue-600 hover:underline">
              {seller.phone}
            </a>
          </div>
          <div className="flex gap-2 ml-2">
            <Mail/>
            <a href={`mailto:${seller.email}?subject=${subject}&body=${body}`} className="text-blue-600">
              {seller.email}
            </a>
          </div>
        </div>
      </section>
      <section>
        <div className="border-1 border-gray-700 rounded-md p-3">
          <h1><b>Descripción</b></h1>
          <p
          className="
            max-h-40
            mt-3
            overflow-hidden
            whitespace-nowrap
            overflow-y-auto
          ">
            {aircraft.shortDescription}
          </p>
        </div>
        <div>

        </div>
      </section>
    </main>
  );
}