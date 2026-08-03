import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../../components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Heart, Share2, Printer, TriangleAlert, FileText } from "lucide-react";
import { DetailRow } from "@/components/ui/DetailRow";

export default async function PlaneDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sparePart = await prisma.sparePart.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: {
          order: "asc"
        }
      }
    },
  });

  if (!sparePart) {
    notFound()
  }

  const seller = await prisma.user.findUnique({
    where: { id: sparePart.sellerId },
  });

  if (!seller) {
    notFound()
  }

  const subject = encodeURIComponent(`Consulta por ${sparePart.model}`);
  const body = encodeURIComponent(
    `Hola, estoy interesado en el avión ${sparePart.model} publicado en Ventas Aeronáuticas.`
  );



  return (
    <main className="container flex flex-col gap-10 mx-auto px-4 py-8">
      <section className="flex items-start gap-6">
        <div className="w-2/3">
          <AircraftGallery images={sparePart.images} />

          <div className="border border-gray-300 rounded-md mt-10 p-4">
            <h1 className="text-xl font-bold mb-3">Descripción</h1>
            <p className="whitespace-pre-line">
              {sparePart.description}
            </p>
          </div>
        </div>
        <div className="w-1/3 flex flex-col">
          <div className="flex justify-between border-2 border-b-0 rounded-t-[10] bg-white p-2">  
            <p className="text-sm text-nowrap">Publicado el {sparePart.createdAt.toLocaleDateString("es-AR")}</p>
            <h6><b>{sparePart.category}</b></h6>
          </div>
          <div className="flex flex-col border-2 rounded-b-[10] rounded-t-[0] bg-white p-5 pt-3 gap-1">
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
              <a href={`/report`} className="group flex">
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
                <TriangleAlert className="text-primary cursor-pointer"/>
              </a>
            </div>

            <Separator className="mb-3 mt-2" />

            <h3><b>{sparePart.title}</b></h3>

            <h3 className="text-(--sidebar-primary)"><b>{sparePart.price ? `US$ ${sparePart.price}` : "Precio a consultar"}</b></h3>
            <Separator className="my-3" />

            <h4 className="text-(--secondary)"><b>Datos del repuesto</b></h4>
            <h5 className="ml-2 text-(--secondary)"><b>Marca:</b> {sparePart.brand}</h5>
            <h5 className="ml-2 text-(--secondary)"><b>Modelo:</b> {sparePart.model}</h5>
            { sparePart.partNumber && <h5 className="ml-2 text-(--secondary)"><b>Numero de parte:</b> {sparePart.partNumber}</h5>}
            <h5 className="ml-2 text-(--secondary)"><b>Condicion:</b> {sparePart.condition}</h5>
            <h5 className="ml-2 text-(--secondary)"><b>Stock:</b> {sparePart.stock}</h5>
        
            {/*
            <Separator className="my-3" />
            <h4><b>Datos del motor</b></h4>
            <h5 className="ml-2"><b>Marca:</b> marca del motor</h5>
            <h5 className="ml-2"><b>Modelo:</b> modelo del motor</h5>
            {sparePart.totalTimeHours && <h5 className="ml-2"><b>Horas totales: </b> {"poner"}</h5>}
            */}
          </div>
          <div className="flex flex-col border-2 rounded-[10] bg-white p-5 mt-5 gap-1">
            <div className="flex items-center justify-between">
              <h4 className="text-(--secondary)"><b>Vendedor</b></h4>
              <div className="flex items-center">
                {seller.image && <img className="rounded-full h-10" src={seller.image} alt="Foto de perfil" />}
                <a className="text-nowrap text-blue-600 ml-2" href={`/profile/${seller.id}`}>
                  <p>Ver perfil</p>
                </a>
              </div>
            </div>
            <h5 className="ml-2 text-(--secondary)">{seller.name}</h5>
            <h6 className="ml-2 mb-4 text-(--secondary)">{`${sparePart.city}, ${sparePart.province}`}</h6>
            <div className="flex gap-2 ml-2 mb-2">
              <Phone/>
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
        </div>
      </section>
    </main>
  );
}