import { PrismaClient, AircraftBrand, AircraftCategory, SellerType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BRANDS_WITH_MODELS: { brand: AircraftBrand; models: string[] }[] = [
  { brand: "AIR_TRACTOR", models: ["AT-502", "AT-602", "AT-802"] },
  { brand: "CESSNA", models: ["Ag Wagon", "Ag Truck", "188"] },
  { brand: "PIPER", models: ["Pawnee", "Brave 375"] },
  { brand: "PZL", models: ["M18 Dromader"] },
  { brand: "GRUMMAN", models: ["Ag Cat"] },
  { brand: "EMBRAER", models: ["Ipanema EMB 202", "Ipanema EMB 203"] },
];

const CATEGORIES: AircraftCategory[] = ["MONOMOTOR", "MULTIMOTOR", "TURBOHELICE"];

async function main() {
  console.log("🌱 Empezando el seed...");

  // Planes de créditos
  await prisma.plan.createMany({
    data: [
      { name: "Particular x1", sellerType: "PARTICULAR", postsIncluded: 1, price: 50 },
      { name: "Particular x5", sellerType: "PARTICULAR", postsIncluded: 5, price: 200 },
      { name: "Particular x10", sellerType: "PARTICULAR", postsIncluded: 10, price: 350 },
      { name: "Mayorista x10", sellerType: "MAYORISTA", postsIncluded: 10, price: 350 },
      { name: "Mayorista x20", sellerType: "MAYORISTA", postsIncluded: 20, price: 650 },
      { name: "Mayorista x50", sellerType: "MAYORISTA", postsIncluded: 50, price: 1500 },
    ],
  });

  // Vendedores de prueba
  const sellers = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.user.create({
        data: {
          email: faker.internet.email(),
          passwordHash: "temp_hash_no_usar_en_produccion",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          sellerType: i < 3 ? SellerType.PARTICULAR : SellerType.MAYORISTA,
        },
      })
    )
  );

  // Aviones de prueba
  for (let i = 0; i < 25; i++) {
    const { brand, models } = faker.helpers.arrayElement(BRANDS_WITH_MODELS);
    const model = faker.helpers.arrayElement(models);
    const category = faker.helpers.arrayElement(CATEGORIES);
    const seller = faker.helpers.arrayElement(sellers);
    const isPriceOnRequest = faker.datatype.boolean({ probability: 0.15 });

    await prisma.aircraft.create({
      data: {
        sellerId: seller.id,
        shortDescription: `${brand.replace("_", " ")} ${model}, motorizado, listo para operar en próxima campaña.`,
        priceOnRequest: isPriceOnRequest,
        price: isPriceOnRequest ? null : faker.number.int({ min: 80000, max: 900000 }),
        brand,
        model,
        year: faker.number.int({ min: 1985, max: 2022 }),
        category,
        totalTimeHours: faker.number.int({ min: 200, max: 12000 }),
        engineHours: faker.number.int({ min: 50, max: 2000 }),
        location: faker.location.city() + ", Argentina",
        extraDescription: faker.lorem.paragraphs(2),
        status: "ACTIVE",
        listingStartsAt: new Date(),
        listingExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        images: {
          create: Array.from({ length: 4 }).map((_, order) => ({
            url: `https://picsum.photos/seed/aircraft-${i}-${order}/800/600`,
            order,
          })),
        },
      },
    });
  }

  console.log("✅ Seed completo: 5 planes, 5 vendedores, 25 aviones creados");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });