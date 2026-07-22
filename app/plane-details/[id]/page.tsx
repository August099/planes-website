import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../components/ui/Carousel";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Heart, Share2, Printer } from "lucide-react";

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
    <main className="container mx-auto px-4 py-8">
      <section className="flex gap-6">
        <div className="w-2/3">
          <AircraftGallery images={aircraft.images} />
        </div>
        <div className="w-1/3 flex flex-col border-2 rounded-[10] bg-white p-5 gap-2">
          <div className="w-full flex gap-3">
            <Heart className="cursor-pointer"/>
            <Share2 className="cursor-pointer"/>
            <Printer className="cursor-pointer"/>
          </div>
          <Separator className="my-4" />
          <h1><b>Datos del vendedor</b></h1>
          <h3 className="ml-2"><b>Vendedor:</b> {seller.name}</h3>
          <h3 className="ml-2"><b>Provincia:</b> {aircraft.province}</h3>
          <h3 className="ml-2"><b>Ciudad:</b> {aircraft.city}</h3>
          <a className="w-min text-nowrap ml-2" href={`/user/${seller.id}`}>Ver perfil {seller.image && <img src={seller.image} alt="Foto de perfil" />}</a>
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
          <div></div>
          <button className="bg-red-700 text-white font-bold">Reportar</button>
        </div>
      </section>
    </main>
  );
}