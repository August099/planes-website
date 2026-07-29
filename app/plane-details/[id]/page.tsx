import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Heart, Share2, Printer, TriangleAlert, IdCard, Wrench, FileText, MapPin } from "lucide-react";
import { DetailRow } from "@/components/ui/DetailRow";

export default async function PlaneDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const aircraft = await prisma.aircraft.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: {
          order: "asc"
        }
      },
      engines: true,
      documents: true
    },
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

          <div className="border border-gray-300 rounded-md mt-10 p-4">
            <h1 className="text-xl font-bold mb-3">Descripción</h1>
            <p className="whitespace-pre-line">
              {aircraft.description}
            </p>
          </div>
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
              <TriangleAlert className="text-primary cursor-pointer"/>
            </div>
          </div>
          <Separator className="my-4" />

            <h4><b>Datos de la aeronave</b></h4>
            <h5 className="ml-2"><b>Precio: {aircraft.price ? `$${aircraft.price}` : "A consultar"}</b></h5>
            <h5 className="ml-2"><b>Año:</b> {aircraft.year}</h5>
            <h5 className="ml-2"><b>Marca:</b> {aircraft.brand}</h5>
            <h5 className="ml-2"><b>Modelo:</b> {aircraft.model}</h5>
            {aircraft.totalTimeHours && <h5 className="ml-2"><b>Horas totales: </b> {aircraft.totalTimeHours}</h5>}
            <h6 className="ml-2"><b>Publicado </b>{aircraft.createdAt.toLocaleDateString("es-AR")}</h6>
          <Separator className="my-4" />

            <h4><b>Datos del motor</b></h4>
            <h5 className="ml-2"><b>Marca:</b> marca del motor</h5>
            <h5 className="ml-2"><b>Modelo:</b> modelo del motor</h5>
            {aircraft.totalTimeHours && <h5 className="ml-2"><b>Horas totales: </b> {"poner"}</h5>}
          <Separator className="my-4" />

          <h4><b>Datos del vendedor</b></h4>
          <h5 className="ml-2"><b>Vendedor:</b> {seller.name}</h5>
          <h5 className="ml-2"><b>Provincia:</b> {aircraft.province}</h5>
          <h5 className="ml-2"><b>Ciudad:</b> {aircraft.city}</h5>
          <a className="w-min text-nowrap ml-2" href={`/profile/${seller.id}`}>{seller.image && <img src={seller.image} alt="Foto de perfil" />} Ver perfil</a>
          <Separator className="my-4" />

          <h4><b>Contactos</b></h4>
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
      <section className="flex flex-col gap-8">
        <h2 className="text-2xl font-semibold mb-4">Información adicional</h2>
        <div>
          <h2 className="text-2xl font-semibold mb-3">General</h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <DetailRow label="Matrícula" value={"Matricula"} />
            <DetailRow label="Categoría" value={aircraft.category} />
            <DetailRow label="Provincia / Ciudad" value={`${aircraft.province} - ${aircraft.city}`} />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">Motor y célula</h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <DetailRow label="Horas totales (célula)" value={aircraft.totalTimeHours} />
            <DetailRow label="Marca del motor" value={"— placeholder —"} />
            <DetailRow label="Modelo del motor" value={"— placeholder —"} />
            <DetailRow label="Horas del motor" value={"poner"} last />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">Modificaciones</h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <DetailRow label="Modificaciones" value={"— placeholder —"} multiline last />
          </div>
        </div>
      </section>
    </main>
  );
}