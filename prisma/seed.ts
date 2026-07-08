import { PrismaClient, AircraftCategory, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MANUFACTURERS = [
  { name: "Cessna", models: ["172 Skyhawk", "182 Skylane", "Citation CJ2"] },
  { name: "Beechcraft", models: ["Baron 58", "Bonanza G36", "King Air 350"] },
  { name: "Cirrus", models: ["SR22", "SR20", "Vision Jet"] },
  { name: "Piper", models: ["Archer III", "Seneca V", "M600"] },
  { name: "Bombardier", models: ["Challenger 350", "Global 6000"] },
];

const CATEGORIES = Object.values(AircraftCategory);

function randomPrice(category: AircraftCategory) {
  const ranges: Record<string, [number, number]> = {
    MONOMOTOR: [80000, 450000],
    MULTIMOTOR: [300000, 900000],
    TURBOHELICE: [900000, 3000000],
    JET: [2000000, 15000000],
    HELICOPTERO: [500000, 4000000],
  };
  const [min, max] = ranges[category];
  return faker.number.int({ min, max });
}

async function main() {
  console.log("🌱 Empezando el seed...");

  // Crear vendedores de prueba
  const sellers = await Promise.all(
    Array.from({ length: 5 }).map(() =>
      prisma.user.create({
        data: {
          email: faker.internet.email(),
          passwordHash: "temp_hash_no_usar_en_produccion",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          role: Role.SELLER,
        },
      })
    )
  );

  // Crear 25 aviones de prueba
  for (let i = 0; i < 25; i++) {
    const manufacturer = faker.helpers.arrayElement(MANUFACTURERS);
    const model = faker.helpers.arrayElement(manufacturer.models);
    const category = faker.helpers.arrayElement(CATEGORIES);
    const seller = faker.helpers.arrayElement(sellers);

    await prisma.aircraft.create({
      data: {
        sellerId: seller.id,
        title: `${manufacturer.name} ${model} ${faker.number.int({ min: 2005, max: 2023 })}`,
        manufacturer: manufacturer.name,
        model,
        year: faker.number.int({ min: 2005, max: 2023 }),
        price: randomPrice(category),
        category,
        totalTimeHours: faker.number.int({ min: 200, max: 8000 }),
        engineHours: faker.number.int({ min: 50, max: 2000 }),
        location: faker.location.city() + ", Argentina",
        description: faker.lorem.paragraphs(2),
        images: {
          create: Array.from({ length: 4 }).map((_, order) => ({
            url: `https://picsum.photos/seed/aircraft-${i}-${order}/800/600`,
            order,
          })),
        },
      },
    });
  }

  console.log("✅ Seed completo: 5 vendedores, 25 aviones creados");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });