import { 
  PrismaClient, 
  AircraftBrand, 
  AircraftCategory, 
  SparePartCategory, 
  SparePartCondition,
  PlanType
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

  // Limpieza inicial en orden de dependencias de Claves Foráneas
  await prisma.sparePartImage.deleteMany({});
  await prisma.sparePartLead.deleteMany({});
  await prisma.sparePart.deleteMany({});
  await prisma.aircraftImage.deleteMany({});
  await prisma.aircraftDocument.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Crear Planes y Suscripciones Unificados
  console.log("📦 Insertando planes y suscripciones...");
  await prisma.plan.createMany({
    data: [
      // PACKS DE CRÉDITOS MINORISTAS
      {
        name: "Pack Básico",
        type: PlanType.CREDIT_PACK,
        price: 4500,
        credits: 1,
        savingsPercent: 0,
        usageDescription: "Ideal para publicar 1 repuesto o accesorio puntual.",
      },
      {
        name: "Pack Estándar",
        type: PlanType.CREDIT_PACK,
        price: 20000,
        credits: 5,
        savingsPercent: 11,
        usageDescription: "Perfecto para vender varios repuestos o equipamiento de aviónica.",
      },
      {
        name: "Pack Aeronave / Pro",
        type: PlanType.CREDIT_PACK,
        price: 36000,
        credits: 10,
        savingsPercent: 20,
        usageDescription: "Suficiente para 1 aeronave completa o hasta 10 repuestos.",
      },

      // PACKS DE CRÉDITOS MAYORISTAS
      {
        name: "Pack Mayorista S",
        type: PlanType.CREDIT_PACK,
        price: 95000,
        credits: 30,
        savingsPercent: 30,
        usageDescription: "Para rotación frecuente de repuestos e instrumental aeronáutico.",
      },
      {
        name: "Pack Mayorista M",
        type: PlanType.CREDIT_PACK,
        price: 200000,
        credits: 70,
        savingsPercent: 36,
        usageDescription: "Ideal para publicar varias aeronaves o un catálogo variado de insumos.",
      },
      {
        name: "Pack Mayorista L",
        type: PlanType.CREDIT_PACK,
        price: 380000,
        credits: 150,
        savingsPercent: 43,
        usageDescription: "Volumen pensado para hangares, talleres y grandes inventarios.",
      },

      // SUSCRIPCIONES MENSUALES
      {
        name: "Suscripción Taller / Repuestos",
        type: PlanType.SUBSCRIPTION,
        price: 45000,
        includesVerifiedBadge: true,
        allowsAircrafts: false,
        allowsSpareParts: true,
        usageDescription: "Publicaciones ilimitadas de Repuestos, Accesorios e Instrumental. Perfil con distintivo verificado.",
      },
      {
        name: "Suscripción Dealer / Broker",
        type: PlanType.SUBSCRIPTION,
        price: 120000,
        includesVerifiedBadge: true,
        allowsAircrafts: true,
        allowsSpareParts: true,
        usageDescription: "Publicaciones ilimitadas de Aeronaves completas y Repuestos + Presencia destacada.",
      },
    ],
  });

  // 2. Crear Usuarios (Todos con el mismo tipo unificado)
  console.log("👤 Creado usuarios vendedores...");
  const sellers = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.user.create({
        data: {
          email: faker.internet.email(),
          passwordHash: "temp_hash_no_usar_en_produccion",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          creditsBalance: faker.number.int({ min: 0, max: 20 }), // Saldo inicial aleatorio
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
            url: `https://picsum.photos/seed/spare-${i}-${order}/800/600`, 
            order,
          })),
        },
      },
    });
  }

  console.log("✅ Seed completo: Base de datos limpia con 8 planes/suscripciones, 5 usuarios, 25 aviones y 15 repuestos.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });