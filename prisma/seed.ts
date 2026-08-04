import { 
  PrismaClient, 
  AircraftBrand, 
  AircraftCategory, 
  SparePartCategory, 
  SparePartCondition,
  AircraftStatus,
  SparePartStatus,
  PlanType,
  PlanBillingType,
  BillingInterval,
  SubscriptionStatus
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
  "MONOMOTOR",
  "BIMOTOR",
  "AGRICOLA",
  "EXPERIMENTAL",
  "HELICOPTERO",
  "PROYECTO"
];

const SPARE_PART_CATEGORIES: SparePartCategory[] = [
  "AVIONICS_RADIO",
  "ENGINE",
  "AIRFRAME",
  "SPRAYING",
  "PROPELLER",
  "HARDWARE",
  "ELECTRICAL",
  "INTERIOR",
  "OTHER"
];

const SPARE_PART_CONDITIONS: SparePartCondition[] = [
  "NUEVO",
  "USADO",
  "REMANUFACTURADO"
];

// Lista de Tags para publicaciones
const SAMPLE_TAGS = [
  "IFA Vigente",
  "Aeroaplicador",
  "Habilitado ANAC",
  "Mantenimiento al Día",
  "GPS Garmin",
  "Tanque Suplementario",
  "Listo para Transferir",
  "Pintura Nueva",
  "Siempre Bajo Techo",
  "Unico Dueño"
];

// Preguntas frecuentes para simular
const SAMPLE_QUESTIONS = [
  "¿Sigue disponible?",
  "¿Aceptas permuta por vehículo o menor valor?",
  "¿Tiene el historial de mantenimiento y registros de inspección completos?",
  "¿En qué aeródromo o taller se puede coordinar una inspección presencial?",
  "¿Tiene habilitación de la ANAC al día?",
  "¿El precio es negociable si se realiza la compra de contado?",
];

const SAMPLE_ANSWERS = [
  "Hola, sí, sigue disponible para coordinar una visita.",
  "Buenas tardes. Podríamos evaluar una permuta de mi interés, contáctame al teléfono de la publicación.",
  "Hola! Sí, cuento con toda la documentación y registros de inspección al día.",
  "Se puede revisar con tu mecánico de confianza en el aeroclub local previa coordinación.",
  "Hola, sí, tiene la habilitación vigente y está listo para transferir.",
];

async function main() {
  console.log("🌱 Empezando el seed...");

  // 0. Limpieza en orden respetando FK constraints
  console.log("🧹 Limpiando la base de datos...");
  await prisma.question.deleteMany({});
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
  await prisma.subscription.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.plan.deleteMany({});

  // 1. Crear Planes y Suscripciones predeterminados
  console.log("💳 Creando planes de pago y suscripciones...");
  const plansData = [
    {
      name: "Plan 1 Avión",
      type: PlanType.AIRCRAFT_PACK,
      billingType: PlanBillingType.ONE_TIME,
      price: 50.0,
      usageDescription: "Publicación individual de 1 aeronave",
      aircraftListingsCount: 1,
      sparePartsListingsCount: 0,
      isUnlimitedAircraft: false,
      isUnlimitedSpareParts: false,
    },
    {
      name: "Plan 3 Aviones",
      type: PlanType.AIRCRAFT_PACK,
      billingType: PlanBillingType.ONE_TIME,
      price: 120.0,
      savingsPercent: 20,
      usageDescription: "Pack de 3 publicaciones de aeronaves",
      aircraftListingsCount: 3,
      sparePartsListingsCount: 0,
      isUnlimitedAircraft: false,
      isUnlimitedSpareParts: false,
    },
    {
      name: "Plan 1 Repuesto",
      type: PlanType.SPARE_PART_PACK,
      billingType: PlanBillingType.ONE_TIME,
      price: 15.0,
      usageDescription: "Publicación individual de 1 repuesto",
      aircraftListingsCount: 0,
      sparePartsListingsCount: 1,
      isUnlimitedAircraft: false,
      isUnlimitedSpareParts: false,
    },
    {
      name: "Plan 5 Repuestos",
      type: PlanType.SPARE_PART_PACK,
      billingType: PlanBillingType.ONE_TIME,
      price: 50.0,
      savingsPercent: 33,
      usageDescription: "Pack de 5 publicaciones de repuestos",
      aircraftListingsCount: 0,
      sparePartsListingsCount: 5,
      isUnlimitedAircraft: false,
      isUnlimitedSpareParts: false,
    },
    {
      name: "Suscripción Repuestos Ilimitados",
      type: PlanType.SUBSCRIPTION,
      billingType: PlanBillingType.SUBSCRIPTION,
      billingInterval: BillingInterval.MONTHLY,
      price: 80.0,
      usageDescription: "Publicación ilimitada de repuestos y accesorios",
      aircraftListingsCount: 0,
      sparePartsListingsCount: 0,
      isUnlimitedAircraft: false,
      isUnlimitedSpareParts: true,
      includesVerifiedBadge: true,
    },
    {
      name: "Suscripción Aviones y Repuestos Ilimitados",
      type: PlanType.SUBSCRIPTION,
      billingType: PlanBillingType.SUBSCRIPTION,
      billingInterval: BillingInterval.MONTHLY,
      price: 250.0,
      usageDescription: "Publicación ilimitada de aeronaves y repuestos",
      aircraftListingsCount: 0,
      sparePartsListingsCount: 0,
      isUnlimitedAircraft: true,
      isUnlimitedSpareParts: true,
      includesVerifiedBadge: true,
    },
  ];

  const createdPlans = await Promise.all(
    plansData.map((plan) => prisma.plan.create({ data: plan }))
  );

  // 2. Crear Tags predeterminados
  console.log("🏷️ Creando tags...");
  const createdTags = await Promise.all(
    SAMPLE_TAGS.map((name) =>
      prisma.tag.create({
        data: { name, slug: name.replaceAll(" ", "-").toLowerCase() }
      })
    )
  );

  // 3. Crear Usuarios
  console.log("👤 Creando usuarios con ubicación y foto de perfil...");
  const users = await Promise.all(
    Array.from({ length: 8 }).map((_, index) => {
      const locProv = faker.helpers.arrayElement(ARG_LOCATIONS);
      const locCity = faker.helpers.arrayElement(locProv.cities);

      return prisma.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          passwordHash: "temp_hash_no_usar_en_produccion",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=user_${index}`,
          city: locCity,
          province: locProv.province,
          aircraftListingsBalance: faker.number.int({ min: 0, max: 3 }),
          sparePartsListingsBalance: faker.number.int({ min: 0, max: 15 }),
        },
      });
    })
  );

  // 4. Asignar Suscripciones simuladas a algunos usuarios (relación 1 a 1)
  console.log("🔄 Asignando suscripciones de prueba...");
  const subscriptionPlans = createdPlans.filter(p => p.billingType === PlanBillingType.SUBSCRIPTION);
  
  // Asignamos suscripción activa al usuario 0 y al usuario 1
  if (users.length >= 2 && subscriptionPlans.length >= 2) {
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.create({
      data: {
        userId: users[0].id,
        planId: subscriptionPlans[0].id, // Repuestos Ilimitados
        status: SubscriptionStatus.ACTIVE,
        mpSubscriptionId: `mp_sub_${faker.string.alphanumeric(10)}`,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
      }
    });

    await prisma.subscription.create({
      data: {
        userId: users[1].id,
        planId: subscriptionPlans[1].id, // Aviones y Repuestos Ilimitados
        status: SubscriptionStatus.ACTIVE,
        mpSubscriptionId: `mp_sub_${faker.string.alphanumeric(10)}`,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
      }
    });
  }

  // 5. Generar Aeronaves
  console.log("✈️ Generando aeronaves con tags y preguntas...");
  const createdAircrafts = [];

  for (let i = 0; i < 20; i++) {
    const { brand, models } = faker.helpers.arrayElement(BRANDS_WITH_MODELS);
    const model = faker.helpers.arrayElement(models);
    const category = faker.helpers.arrayElement(AIRCRAFT_CATEGORIES);
    const seller = faker.helpers.arrayElement(users);
    const isPriceOnRequest = faker.datatype.boolean({ probability: 0.15 });

    const locProv = faker.helpers.arrayElement(ARG_LOCATIONS);
    const locCity = faker.helpers.arrayElement(locProv.cities);

    const isProyecto = category === "PROYECTO";
    const year = faker.number.int({ min: 1975, max: 2024 });

    const randomTags = faker.helpers.arrayElements(createdTags, faker.number.int({ min: 2, max: 4 }));

    const aircraft = await prisma.aircraft.create({
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
        },
        tags: {
          connect: randomTags.map((t) => ({ id: t.id }))
        }
      },
    });

    createdAircrafts.push(aircraft);
  }

  // 6. Generar Repuestos
  console.log("🛠️ Generando repuestos...");
  const createdSpareParts = [];

  for (let i = 0; i < 15; i++) {
    const seller = faker.helpers.arrayElement(users);
    const category = faker.helpers.arrayElement(SPARE_PART_CATEGORIES);
    const condition = faker.helpers.arrayElement(SPARE_PART_CONDITIONS);
    const isPriceOnRequest = faker.datatype.boolean({ probability: 0.10 });

    const locProv = faker.helpers.arrayElement(ARG_LOCATIONS);
    const locCity = faker.helpers.arrayElement(locProv.cities);

    const sparePart = await prisma.sparePart.create({
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

    createdSpareParts.push(sparePart);
  }

  // 7. Generar Preguntas y Respuestas (Q&A)
  console.log("❓ Generando preguntas y respuestas...");

  // Preguntas para Aeronaves
  for (const aircraft of createdAircrafts) {
    const questionsCount = faker.number.int({ min: 1, max: 3 });

    for (let j = 0; j < questionsCount; j++) {
      const potentialBuyers = users.filter((u) => u.id !== aircraft.sellerId);
      const buyer = faker.helpers.arrayElement(potentialBuyers);

      const hasAnswer = faker.datatype.boolean({ probability: 0.75 });
      const questionDate = faker.date.recent({ days: 15 });

      await prisma.question.create({
        data: {
          aircraftId: aircraft.id,
          userId: buyer.id,
          question: faker.helpers.arrayElement(SAMPLE_QUESTIONS),
          answer: hasAnswer ? faker.helpers.arrayElement(SAMPLE_ANSWERS) : null,
          answeredAt: hasAnswer ? new Date(questionDate.getTime() + 1000 * 60 * 60 * 4) : null,
          createdAt: questionDate,
        }
      });
    }
  }

  // Preguntas para Repuestos
  for (const sparePart of createdSpareParts) {
    const questionsCount = faker.number.int({ min: 0, max: 2 });

    for (let j = 0; j < questionsCount; j++) {
      const potentialBuyers = users.filter((u) => u.id !== sparePart.sellerId);
      const buyer = faker.helpers.arrayElement(potentialBuyers);

      const hasAnswer = faker.datatype.boolean({ probability: 0.60 });
      const questionDate = faker.date.recent({ days: 10 });

      await prisma.question.create({
        data: {
          sparePartId: sparePart.id,
          userId: buyer.id,
          question: faker.helpers.arrayElement(SAMPLE_QUESTIONS),
          answer: hasAnswer ? faker.helpers.arrayElement(SAMPLE_ANSWERS) : null,
          answeredAt: hasAnswer ? new Date(questionDate.getTime() + 1000 * 60 * 60 * 2) : null,
          createdAt: questionDate,
        }
      });
    }
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