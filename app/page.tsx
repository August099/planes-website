import { prisma } from "@/lib/prisma";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { SellerCta } from "@/components/ui/SellerCta";
import { TrustBlock } from "@/components/ui/TrustBlock";
import { SparePartCategoriesCarousel } from "@/components/ui/SparePartCategoriesCarousel";
import { FeaturedAircraftCarousel } from "@/components/ui/FeaturedAircraftCarousel";
import { HeroBanner } from "@/components/ui/hero-banner";
import HomeServicesCards from "@/components/ui/HomeServiceCards";

export default async function HomePage() {
  const featuredAircraftsFromDb = await prisma.aircraft.findMany({
    where: { status: "ACTIVE" },
    include: { 
      images: { orderBy: { order: "asc" }, take: 1 },
      category: true, // Incluimos la relación con la categoría para obtener el objeto con su nombre
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const formattedAircrafts = featuredAircraftsFromDb.map((aircraft) => ({
    id: aircraft.id,
    title: aircraft.title,
    price: aircraft.price ? Number(aircraft.price) : null,
    year: aircraft.year,
    category: aircraft.category ? { id: aircraft.category.id, name: aircraft.category.name } : null,
    totalTimeHours: aircraft.totalTimeHours,
    city: aircraft.city,
    province: aircraft.province,
    imageUrl: aircraft.images[0]?.url ?? "/placeholder.png",
  }));

  return (
    <>
      <HeroBanner />


      <main className="container mx-auto px-4 py-8 space-y-12">
        <FeaturedAircraftCarousel aircrafts={formattedAircrafts} />

        <SparePartCategoriesCarousel />
      </main>

      <SellerCta />

      <HowItWorks />

      <TrustBlock />
    </>
  );
}