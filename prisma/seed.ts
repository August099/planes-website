import { 
  PrismaClient, 
  AircraftBrand, 
  AircraftCategory, 
  SparePartCategory, 
  SparePartCondition,
  PlanType,
  AdBannerStatus
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

// Actualizado al nuevo Schema
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

  // 0. Limpieza inicial (OJO: Se eliminó Subscription y se agregó AdBanner)
  console.log("🧹 Limpiando la base de datos...");
  await prisma.sparePartImage.deleteMany({});
  await prisma.sparePartLead.deleteMany({});
  await prisma.sparePart.deleteMany({});
  await prisma.aircraftImage.deleteMany({});
  await prisma.aircraftDocument.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.adBanner.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Crear Planes (Packs de Aviones, Packs de Repuestos y Banners)
  console.log("📦 Insertando planes y packs...");
  await prisma.plan.createMany({
    data: [
      // PACKS PARA AERONAVES
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

      // PACKS PARA REPUESTOS
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

      // PUBLICIDAD / BANNERS
      {
        name: "Banner Publicitario Main",
        type: PlanType.AD_BANNER,
        price: 80000,
        savingsPercent: 0,
        usageDescription: "Espacio publicitario destacado en la página de inicio por 30 días.",
        aircraftListingsCount: 0,
        sparePartsListingsCount: 0,
      }
    ],
  });

  // 2. Crear Usuarios con sus contadores separados
  console.log("👤 Creando usuarios...");
  const sellers = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.user.create({
        data: {
          email: faker.internet.email(),
          passwordHash: "temp_hash_no_usar_en_produccion",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          // Se les asigna saldo de publicaciones al azar para simular compras previas
          aircraftListingsBalance: faker.number.int({ min: 0, max: 3 }),
          sparePartsListingsBalance: faker.number.int({ min: 0, max: 15 }),
        },
      })
    )
  );

  // 3. Generar Aviones
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
    const shortDesc = isProyecto 
      ? `Aeronave en estado de Proyecto. Desarmada, ideal para restauración o repuestos.`
      : `${brand.replace("_", " ")} ${model}, en excelente estado general y listo para operar.`;

    await prisma.aircraft.create({
      data: {
        sellerId: seller.id,
        title: `${brand.replace("_", " ")} ${model} ${isProyecto ? "(Proyecto)" : faker.number.int({ min: 1975, max: 2024 })}`,
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
        shortDescription: `Repuesto certificado disponible para entrega inmediata.`,
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
            url: `https://picsum.photos/seed/spare-${i}-${order}/800/600`, 
            order,
          })),
        },
      },
    });
  }

  // 5. Generar algunos Banners de prueba
  console.log("📢 Generando banners publicitarios de prueba...");
  for (let i = 0; i < 3; i++) {
    const seller = faker.helpers.arrayElement(sellers);
    await prisma.adBanner.create({
      data: {
        userId: seller.id,
        title: `Banner Test ${i + 1}`,
        description: `Hola admin, quiero que este banner redirija a mi web. Usar los colores de mi logo.`,
        bannerImageUrl: `https://picsum.photos/seed/banner-${i}/1200/200`,
        linkUrl: "https://ejemplo.com",
        status: i === 0 ? AdBannerStatus.ACTIVE : AdBannerStatus.PENDING_REVIEW, // Uno activo, otros pendientes
        startsAt: i === 0 ? new Date() : null,
        expiresAt: i === 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      }
    });
  }

  console.log("✅ Seed completo exitosamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });