import { 
  PrismaClient, 
  AircraftBrand, 
  AircraftCategory, 
  SparePartCategory, 
  SparePartCondition,
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

  // 0. Limpieza en orden (Respetando constraints y SIN tocar la tabla Plan)
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
  await prisma.purchase.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Crear Tags predeterminados
  console.log("🏷️ Creando tags...");
  const createdTags = await Promise.all(
    SAMPLE_TAGS.map((name) =>
      prisma.tag.create({
        data: { name, slug: name.replaceAll(" ", "-") }
      })
    )
  );

  // 2. Crear Usuarios (Vendedores / Compradores)
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
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=user_${index}`, // Foto de perfil simulada
          city: locCity,
          province: locProv.province,
          aircraftListingsBalance: faker.number.int({ min: 0, max: 3 }),
          sparePartsListingsBalance: faker.number.int({ min: 0, max: 15 }),
        },
      });
    })
  );

  // 3. Generar Aeronaves
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

    // Seleccionar de 2 a 4 tags aleatorios sin repetir
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

  // 4. Generar Repuestos
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

  // 5. Generar Preguntas y Respuestas (Q&A)
  console.log("❓ Generando preguntas y respuestas...");

  // Preguntas para Aeronaves
  for (const aircraft of createdAircrafts) {
    const questionsCount = faker.number.int({ min: 1, max: 3 });

    for (let j = 0; j < questionsCount; j++) {
      // Elegir un usuario comprador que NO sea el vendedor de la aeronave
      const potentialBuyers = users.filter((u) => u.id !== aircraft.sellerId);
      const buyer = faker.helpers.arrayElement(potentialBuyers);

      const hasAnswer = faker.datatype.boolean({ probability: 0.75 }); // 75% de probabilidad de tener respuesta
      const questionDate = faker.date.recent({ days: 15 });

      await prisma.question.create({
        data: {
          aircraftId: aircraft.id,
          userId: buyer.id,
          question: faker.helpers.arrayElement(SAMPLE_QUESTIONS),
          answer: hasAnswer ? faker.helpers.arrayElement(SAMPLE_ANSWERS) : null,
          answeredAt: hasAnswer ? new Date(questionDate.getTime() + 1000 * 60 * 60 * 4) : null, // Respondida 4 horas después
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