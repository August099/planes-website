import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AircraftGallery } from "../../../components/ui/Carousel";

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

  return (
    <main className="container mx-auto px-4 py-8">
      <section className="flex gap-6">
        <div className="w-2/3">
          <AircraftGallery images={aircraft.images} />
        </div>
        <div className="w-1/3 flex flex-column border-2 rounded-[10] bg-white">
          <h3>Apellido y nombre: {seller.name}</h3>
          <h3>Apellido y nombre: {seller.name}</h3>
          <h3>Apellido y nombre: {seller.name}</h3>
          <h3>Apellido y nombre: {seller.name}</h3>
        </div>
      </section>
    </main>
  );
}