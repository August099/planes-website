import { 
  PrismaClient, 
  AircraftBrand, 
  AircraftCategory, 
  SparePartCategory, 
  SparePartCondition, 
  SellerType 
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Listado de provincias y ciudades reales de Argentina para cumplir el esquema obligado
const ARG_LOCATIONS = [
  { province: "Buenos Aires", cities: ["Pergamino", "Junín", "Tandil", "Bahía Blanca"] },
  { province: "Córdoba", cities: ["San Francisco", "Río Cuarto", "Marcos Juárez", "Villa María"] },
  { province: "Santa Fe", cities: ["Venado Tuerto", "Rafaela", "Reconquista", "Rosario"] },
  { province: "Entre Ríos", cities: ["Paraná", "Concordia", "Chajarí", "Victoria"] },
  { province: "La Pampa", cities: ["General Pico", "Santa Rosa", "Eduardo Castex"] },
  { province: "Chaco", cities: ["Presidencia Roque Sáenz Peña", "Resistencia", "Charata"] },
];

// Marcas y modelos de aviones actualizados según tus indicaciones
const BRANDS_WITH_MODELS: { brand: AircraftBrand; models: string[] }[] = [
  { brand: "AIR_TRACTOR", models: ["AT-502", "AT-602", "AT-802"] },
  { brand: "CESSNA", models: ["Ag Wagon", "Ag Truck", "188", "172 Skyhawk"] },
  { brand: "PIPER", models: ["Pawnee", "Brave 375", "Dakota"] },
  { brand: "PZL", models: ["M18 Dromader"] },
  { brand: "GRUMMAN", models: ["Ag Cat"] },
  { brand: "EMBRAER", models: ["Ipanema EMB 202", "Ipanema EMB 203"] },
  { brand: "BELL", models: ["206 JetRanger", "407", "UH-1H"] },
  { brand: "CICARE", models: ["CH-7", "CH-12", "CH-14"] },
  { brand: "AIRBUS", models: ["H125", "H135", "H145"] },
  { brand: "AERO_BOERO", models: ["AB-115", "AB-180"] },
  { brand: "BEECHCRAFT", models: ["Bonanza V35", "King Air 200", "Baron 58"] },
];

const AIRCRAFT_CATEGORIES: AircraftCategory[] = [
  "BIMOTOR",
  "MONOMOTOR",
  "FUMIGADOR_PISTON",
  "FUMIGADOR_TURBOHELICE",
  "EXPERIMENTAL",
  "HELICOPTERO",
  "PROYECTO"
];

const SPARE_PART_CATEGORIES: SparePartCategory[] = [
  "MECANICO",
  "ESTRUCTURAL",
  "PIEZA_MOVIL",
  "AVIONICA_Y_RADIO",
  "EQUIPO_DE_FUMIGACION"
];

const SPARE_PART_CONDITIONS: SparePartCondition[] = [
  "NUEVO",
  "USADO",
  "REMANUFACTURADO"
];

async function main() {
  console.log("🌱 Empezando el seed...");

  // Limpieza inicial de datos para evitar colisiones
  await prisma.sparePartImage.deleteMany({});
  await prisma.sparePartLead.deleteMany({});
  await prisma.sparePart.deleteMany({});
  await prisma.aircraftImage.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Crear Planes de créditos
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

  // 2. Crear Vendedores de prueba
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

  // 3. Generar Aviones de prueba (25 registros)
  for (let i = 0; i < 25; i++) {
    const { brand, models } = faker.helpers.arrayElement(BRANDS_WITH_MODELS);
    const model = faker.helpers.arrayElement(models);
    const category = faker.helpers.arrayElement(AIRCRAFT_CATEGORIES);
    const seller = faker.helpers.arrayElement(sellers);
    const isPriceOnRequest = faker.datatype.boolean({ probability: 0.15 });
    
    // Selección de ubicación argentina obligatoria
    const locProv = faker.helpers.arrayElement(ARG_LOCATIONS);
    const locCity = faker.helpers.arrayElement(locProv.cities);

    // Contexto específico si es categoría PROYECTO
    const isProyecto = category === "PROYECTO";
    const shortDesc = isProyecto 
      ? `Aeronave en estado de Proyecto. Desarmada, ideal para restauración o repuestos estructurales faltantes.`
      : `${brand.replace("_", " ")} ${model}, motorizado, listo para operar en próxima campaña.`;

    await prisma.aircraft.create({
      data: {
        sellerId: seller.id,
        title: `${brand.replace("_", " ")} ${model} ${isProyecto ? "(Proyecto / Desarmado)" : faker.number.int({ min: 1975, max: 2024 })}`,
        shortDescription: shortDesc,
        priceOnRequest: isPriceOnRequest,
        price: isPriceOnRequest ? null : faker.number.int({ min: 45000, max: 850000 }),
        brand,
        model,
        year: isProyecto ? null : faker.number.int({ min: 1975, max: 2024 }),
        category,
        totalTimeHours: isProyecto ? null : faker.number.int({ min: 200, max: 14000 }),
        engineHours: isProyecto ? null : faker.number.int({ min: 50, max: 2200 }),
        city: locCity,
        province: locProv.province,
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

  // 4. Generar Repuestos de prueba (15 registros)
  for (let i = 0; i < 15; i++) {
    const seller = faker.helpers.arrayElement(sellers);
    const category = faker.helpers.arrayElement(SPARE_PART_CATEGORIES);
    const condition = faker.helpers.arrayElement(SPARE_PART_CONDITIONS);
    const isPriceOnRequest = faker.datatype.boolean({ probability: 0.10 });
    
    const locProv = faker.helpers.arrayElement(ARG_LOCATIONS);
    const locCity = faker.helpers.arrayElement(locProv.cities);

    await prisma.sparePart.create({
      data: {
        sellerId: seller.id,
        title: `Repuesto ${category.replace("_", " ")} - Estado ${condition}`,
        shortDescription: `Excelente oportunidad. Repuesto certificado en categoría ${category.toLowerCase()} disponible para entrega inmediata.`,
        priceOnRequest: isPriceOnRequest,
        price: isPriceOnRequest ? null : faker.number.int({ min: 500, max: 25000 }),
        category,
        condition,
        city: locCity,
        province: locProv.province,
        brand: faker.helpers.arrayElement(["Garmin", "Bendix", "Bose", "Air Tractor Co.", "Cessna Parts"]),
        model: `Mod-${faker.string.alphanumeric(5).toUpperCase()}`,
        partNumber: `PN-${faker.number.int({ min: 10000, max: 99999 })}-${faker.string.alpha(2).toUpperCase()}`,
        extraDescription: faker.lorem.paragraph(),
        status: "ACTIVE",
        listingStartsAt: new Date(),
        listingExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        images: {
          create: Array.from({ length: 3 }).map((_, order) => ({
            url: `https://picsum.photos{i}-${order}/800/600`,
            order,
          })),
        },
      },
    });
  }

  console.log("✅ Seed completo: Tablas limpiadas, creados 5 planes, 5 vendedores, 25 aviones y 15 repuestos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
