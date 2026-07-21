import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { Button } from "@/components/ui/button";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { SellerCta } from "@/components/ui/SellerCta";
import { TrustBlock } from "@/components/ui/TrustBlock";
import { HeroCarousel } from "@/components/ui/HeroCarousel";
import { ScrollVideoHero } from "@/components/ui/ScrollVideoHero";
import { PriceTicker } from "@/components/ui/PriceTicker";

export default async function HomePage() {
  const featured = await prisma.aircraft.findMany({
    where: { status: "ACTIVE" },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <>

      <PriceTicker />

      <ScrollVideoHero />

      <HeroCarousel />

      <HowItWorks />

      <main className="container mx-auto px-4 py-12">
        <h2 className="text-xl font-heading font-semibold mb-6">
          Publicados recientemente
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((aircraft) => (
            <AircraftCard
              key={aircraft.id}
              id={aircraft.id}
              title={aircraft.title}
              price={aircraft.price ? Number(aircraft.price) : null}
              year={aircraft.year}
              category={aircraft.category}
              totalTimeHours={aircraft.totalTimeHours}
              location={aircraft.location}
              imageUrl={aircraft.images[0]?.url ?? "/placeholder.png"}
            />
          ))}
        </div>
      </main>

      <SellerCta />

      <TrustBlock />

    </>
  );
}