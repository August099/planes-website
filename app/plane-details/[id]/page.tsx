import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Heart, Share2, Printer, TriangleAlert, FileText } from "lucide-react";
import { DetailRow } from "@/components/ui/DetailRow";

const tags = [
  {
    id: 1,
    name: "turbo"
  },
  {
    id: 2,
    name: "cabina"
  },
  {
    id: 3,
    name: "helice"
  },
  {
    id: 4,
    name: "motor"
  },
  {
    id: 5,
    name: "fucelaje"
  },
  {
    id: 6,
    name: "equipo"
  },
  {
    id: 7,
    name: "tag7"
  },
  {
    id: 8,
    name: "tag8"
  },
  {
    id: 9,
    name: "tag9"
  },
  {
    id: 10,
    name: "tag10"
  }
]

const documentos = [
  {
    id: 1,
    url: "../../../../public/Diseño del sistema y arquitectura.pdf"
  }
]

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
      propeller: true,
      documents: true,
      tags: true
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
      <section className="flex items-start gap-6">
        <div className="w-2/3">
          <AircraftGallery images={aircraft.images} />

          <div className="border border-gray-300 rounded-md mt-10 p-4">
            <h1 className="text-xl font-bold mb-3">Descripción</h1>
            <p className="whitespace-pre-line">
              {aircraft.description}
            </p>
          </div>

          <section className="flex flex-col gap-8 mt-10">
            <h2 className="text-2xl font-semibold">Información adicional</h2>
            <div>
              <h2 className="text-2xl font-semibold mb-3">Aeronave</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <DetailRow label="Provincia" value={aircraft.province} />
                <DetailRow label="Ciudad" value={aircraft.city} />
                {aircraft.category && <DetailRow label="Modificaciones" value={aircraft.category} />}
                {aircraft.modifications && <DetailRow label="Modificaciones" value={aircraft.modifications} />}
              </div>
            </div>

            {aircraft.engines.map((engine, index) => (
              <div key={engine.id}>
                <h2 className="text-2xl font-semibold mb-3">Motor {index + 1}</h2>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <DetailRow label="TBO" value={engine.TBO} />
                  {engine.engineHours && <DetailRow label="Horas totales" value={engine.engineHours} />}
                  {engine.brand && <DetailRow label="Marca" value={engine.brand} />}
                  {engine.model && <DetailRow label="Modelo" value={engine.model} />}
                </div>
              </div>
            ))}

            {aircraft.propeller.map((p, index) => (
              <div key={p.id}>
                <h2 className="text-2xl font-semibold mb-3">Helice {index + 1}</h2>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {p.propellerHours && <DetailRow label="Horas totales" value={p.propellerHours} />}
                  {p.model && <DetailRow label="Modelo" value={p.model} />}
                </div>
              </div>
            ))}

            {(aircraft.fuselageDescription ||
              aircraft.fuselageModifications ||
              aircraft.avionics ||
              aircraft.extraEquipment) &&
            <div>
              <h2 className="text-2xl font-semibold mb-3">Fuselaje</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {aircraft.fuselageDescription && <DetailRow label="Descripcion" value={aircraft.fuselageDescription} />}
                {aircraft.fuselageModifications && <DetailRow label="Modificaciones" value={aircraft.fuselageModifications} />}
                {aircraft.avionics && <DetailRow label="Avionica" value={aircraft.avionics} />}
                {aircraft.extraEquipment && <DetailRow label="Equipo extra" value={aircraft.extraEquipment} />}
              </div>
            </div>}
          </section>
        </div>
        <div className="w-1/3 flex flex-col">
          <div className="flex justify-between border-2 border-b-0 rounded-t-[10] bg-white p-2">  
            <p className="text-sm text-nowrap">Publicado el {aircraft.createdAt.toLocaleDateString("es-AR")}</p>
            <h6><b>{aircraft.category}</b></h6>
          </div>
          <div className="flex flex-col border-2 rounded-b-[10] rounded-t-[0] bg-white p-5 pt-3 gap-2">
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

            <Separator className="mb-3 mt-2" />

            <h3><b>{aircraft.title}</b></h3>

            <h3 className="text-(--sidebar-primary)"><b>{aircraft.price ? `US$ ${aircraft.price}` : "Precio a consultar"}</b></h3>
            <Separator className="my-3" />

            <h4 className="text-(--secondary)"><b>Datos de la aeronave</b></h4>
            <h5 className="ml-2 text-(--secondary)"><b>Año:</b> {aircraft.year}</h5>
            <h5 className="ml-2 text-(--secondary)"><b>Marca:</b> {aircraft.brand}</h5>
            <h5 className="ml-2 text-(--secondary)"><b>Modelo:</b> {aircraft.model}</h5>
            {aircraft.totalTimeHours && <h5 className="ml-2 text-(--secondary)"><b>Horas totales: </b> {aircraft.totalTimeHours}</h5>}
            
            {/*
            <Separator className="my-3" />
            <h4><b>Datos del motor</b></h4>
            <h5 className="ml-2"><b>Marca:</b> marca del motor</h5>
            <h5 className="ml-2"><b>Modelo:</b> modelo del motor</h5>
            {aircraft.totalTimeHours && <h5 className="ml-2"><b>Horas totales: </b> {"poner"}</h5>}
            */}
          </div>
          <div className="flex flex-col border-2 rounded-[10] bg-white p-5 mt-5 gap-1">
            <div className="flex justify-between">
              <h4 className="text-(--secondary)"><b>Vendedor</b></h4>
              <a className="w-min text-nowrap text-blue-600 ml-2" href={`/profile/${seller.id}`}>{seller.image && <img src={seller.image} alt="Foto de perfil" />} Ver perfil</a>
            </div>
            <h5 className="ml-2 text-(--secondary)">{seller.name}</h5>
            <h6 className="ml-2 mb-4 text-(--secondary)">{`${aircraft.city}, ${aircraft.province}`}</h6>
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
          <div className="flex flex-col border-2 rounded-[10] bg-white p-5 mt-5 gap-1">
            {documentos.map(doc => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border rounded-lg p-3 hover:bg-gray-50 transition-colors w-fit"
              >
                <FileText className="w-8 h-8 text-red-600" />
                <span className="text-sm font-medium">{"Ver documento"}</span>
              </a>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {tags.map(tag => (
              <div key={tag.id} className="p-1 border-2 rounded-xl cursor-pointer bg-(--border)">
                <p className="text-sm">{tag.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}