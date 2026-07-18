import { prisma } from "@/lib/prisma";
import { AircraftCard } from "@/components/ui/AircraftCard";

export default async function AvionesPage() {
  const aircrafts = await prisma.aircraft.findMany({
    where: { status: "ACTIVE" },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium mb-6">
        Aviones en venta ({aircrafts.length})
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {aircrafts.map((aircraft) => (
          <AircraftCard
            key={aircraft.id}
            id={aircraft.id}
            title={aircraft.model}
            price={Number(aircraft.price)}
            year={aircraft.year}
            category={aircraft.category}
            totalTimeHours={aircraft.totalTimeHours}
            location={aircraft.location}
            imageUrl={aircraft.images[0]?.url ?? "/placeholder.png"}
          />
        ))}
      </div>
    </main>
  );
}