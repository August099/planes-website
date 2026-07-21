import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium">{aircraft.model}</h1>
      {/* resto del detalle: galería, specs, contacto */}
    </main>
  );
}