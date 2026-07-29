import { 
  PrismaClient, 
  AircraftBrand, 
  AircraftCategory, 
  SparePartCategory, 
  SparePartCondition,
  PlanType,
  AircraftStatus,
  SparePartStatus
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Listado de provincias y ciudades reales de Argentina
const ARG_LOCATIONS = [
  { province: "Buenos Aires", cities: ["Pergamino", "Junín", "Tandil", "Bahía Blanca"] },
  { province: "Córdoba", cities: ["San Francisco", "Río Cuarto", "Marcos Juárez", "Villa María"] },
  { province: "Santa Fe", cities: ["Venado Tuerto", "Rafaela", "Reconquista", "Rosario"] },
  { province: "Entre Ríos", cities: ["Paraná", "Concordia", "Chajarí", "Victoria"] },
  { province: "La Pampa", cities: ["General Pico", "Santa Rosa", "Eduardo Castex"] },
  { province: "Chaco", cities: ["Presidencia Roque Sáenz Peña", "Resistencia", "Charata"] },
];

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
  "PISTON",
  "TURBOHELICE",
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

  // 0. Limpieza inicial en orden para respetar FK constraints
  console.log("🧹 Limpiando la base de datos...");
  await prisma.sparePartImage.deleteMany({});
  await prisma.sparePartLead.deleteMany({});
  await prisma.sparePart.deleteMany({});
  await prisma.aircraftImage.deleteMany({});
  await prisma.aircraftDocument.deleteMany({});
  await prisma.aircraftEngine.deleteMany({});
  await prisma.aircraftPropeller.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.adBanner.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Crear Planes (Packs de Aviones y Repuestos)
  console.log("📦 Insertando planes y packs...");
  await prisma.plan.createMany({
    data: [
      {
        name: "Pack 1 Aeronave",
        type: PlanType.AIRCRAFT_PACK,
        price: 25000,
        savingsPercent: 0,
        usageDescription: "Publica 1 aeronave hasta que se venda.",
        aircraftListingsCount: 1,
        sparePartsListingsCount: 0,
      },
      {
        name: "Pack 3 Aeronaves",
        type: PlanType.AIRCRAFT_PACK,
        price: 65000,
        savingsPercent: 13,
        usageDescription: "Publica hasta 3 aeronaves. Ideal para agencias.",
        aircraftListingsCount: 3,
        sparePartsListingsCount: 0,
      },
      {
        name: "Pack 1 Repuesto",
        type: PlanType.SPARE_PART_PACK,
        price: 4500,
        savingsPercent: 0,
        usageDescription: "Publica 1 repuesto, accesorio o instrumental.",
        aircraftListingsCount: 0,
        sparePartsListingsCount: 1,
      },
      {
        name: "Pack 10 Repuestos",
        type: PlanType.SPARE_PART_PACK,
        price: 35000,
        savingsPercent: 22,
        usageDescription: "Volumen pensado para talleres y rotación frecuente.",
        aircraftListingsCount: 0,
        sparePartsListingsCount: 10,
      },
    ],
  });

  // 2. Crear Usuarios Vendedores
  console.log("👤 Creando usuarios...");
  const sellers = await Promise.all(
    Array.from({ length: 5 }).map(() =>
      prisma.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          passwordHash: "temp_hash_no_usar_en_produccion",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          aircraftListingsBalance: faker.number.int({ min: 0, max: 3 }),
          sparePartsListingsBalance: faker.number.int({ min: 0, max: 15 }),
        },
      })
    )
  );

  // 3. Generar Aeronaves
  console.log("✈️ Generando aeronaves...");
  for (let i = 0; i < 25; i++) {
    const { brand, models } = faker.helpers.arrayElement(BRANDS_WITH_MODELS);
    const model = faker.helpers.arrayElement(models);
    const category = faker.helpers.arrayElement(AIRCRAFT_CATEGORIES);
    const seller = faker.helpers.arrayElement(sellers);
    const isPriceOnRequest = faker.datatype.boolean({ probability: 0.15 });
    
    const locProv = faker.helpers.arrayElement(ARG_LOCATIONS);
    const locCity = faker.helpers.arrayElement(locProv.cities);

    const isProyecto = category === "PROYECTO";
    const year = faker.number.int({ min: 1975, max: 2024 });

    await prisma.aircraft.create({
      data: {
        sellerId: seller.id,
        title: `${brand.replace("_", " ")} ${model} ${isProyecto ? "(Proyecto)" : year}`,
        description: isProyecto 
          ? `Aeronave en estado de Proyecto. Desarmada, ideal para restauración o repuestos. ${faker.lorem.paragraphs(1)}`
          : `${brand.replace("_", " ")} ${model}, en excelente estado general y listo para operar. ${faker.lorem.paragraphs(1)}`,
        brand,
        model,
        year,
        category,
        totalTimeHours: faker.number.int({ min: 200, max: 14000 }),
        price: isPriceOnRequest ? null : faker.number.int({ min: 45000, max: 850000 }),
        city: locCity,
        province: locProv.province,
        status: AircraftStatus.ACTIVE,
        listingStartsAt: new Date(),
        listingExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        images: {
          create: Array.from({ length: 4 }).map((_, order) => ({
            url: `https://picsum.photos/seed/aircraft-${i}-${order}/800/600`,
            order,
          })),
        },
        engines: {
          create: [
            {
              engineHours: faker.number.int({ min: 50, max: 1800 }),
              TBO: 2000,
              brand: faker.helpers.arrayElement(["Pratt & Whitney", "Lycoming", "Continental"]),
              model: "Mod-Engine-1",
            }
          ]
        },
        propeller: {
          create: [
            {
              propellerHours: faker.number.int({ min: 30, max: 1000 }),
              model: "Hartzell 3-Blade",
            }
          ]
        }
      },
    });
  }

  // 4. Generar Repuestos
  console.log("🛠️ Generando repuestos...");
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
        title: `Repuesto ${category.replace("_", " ")} - ${condition}`,
        description: `Repuesto certificado disponible para entrega inmediata. ${faker.lorem.paragraph()}`,
        price: isPriceOnRequest ? null : faker.number.int({ min: 500, max: 25000 }),
        category,
        condition,
        stock: faker.number.int({ min: 1, max: 5 }),
        city: locCity,
        province: locProv.province,
        brand: faker.helpers.arrayElement(["Garmin", "Bendix", "Bose", "Air Tractor Co.", "Cessna Parts"]),
        model: `Mod-${faker.string.alphanumeric(5).toUpperCase()}`,
        partNumber: `PN-${faker.number.int({ min: 10000, max: 99999 })}-${faker.string.alpha(2).toUpperCase()}`,
        status: SparePartStatus.ACTIVE,
        listingStartsAt: new Date(),
        listingExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        images: {
          create: Array.from({ length: 3 }).map((_, order) => ({
            url: `https://picsum.photos/seed/spare-${i}-${order}/800/600`, 
            order,
          })),
        },
      },
    });
  }

  console.log("✅ Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });