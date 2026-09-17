import { 
  PrismaClient, 
  UserType, 
  AircraftCondition, 
  AircraftStatus, 
  SparePartStatus,
  EngineType,
  SparepartCondition 
} from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🛠️ Iniciando la generación de Mocks...');

  // 1. Crear 6 Usuarios Mock
  console.log('Creando 6 usuarios de prueba...');
  const usersToCreate = [
    { email: 'particular@test.com', name: 'Juan Perez', userType: UserType.PARTICULAR, city: 'Buenos Aires', province: 'Buenos Aires', phone: '1123456789' },
    { email: 'reseller@test.com', name: 'AeroVentas S.A.', userType: UserType.RESELLER, city: 'Córdoba', province: 'Córdoba', phone: '3512345678' },
    { email: 'factory@test.com', name: 'Repuestos Delta', userType: UserType.FACTORY, city: 'Mendoza', province: 'Mendoza', phone: '2612345678' },
    { email: 'piloto1@test.com', name: 'Carlos Gomez', userType: UserType.PARTICULAR, city: 'Rosario', province: 'Santa Fe', phone: '3412345678' },
    { email: 'admin@test.com', name: 'Admin Hangar', userType: UserType.PARTICULAR, isAdmin: true, city: 'CABA', province: 'CABA', phone: '1143219876' },
    { email: 'vendedor6@test.com', name: 'Aeronáutica Sur', userType: UserType.RESELLER, city: 'Neuquén', province: 'Neuquén', phone: '2992345678' },
  ];

  const createdUsers = [];
  for (const u of usersToCreate) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u },
    });
    createdUsers.push(user);
  }

  // Obtener datos reales de la base para usarlos en los mocks
  const aircraftCategories = await prisma.aircraftCategory.findMany();
  const brandsWithModels = await prisma.aircraftBrand.findMany({ include: { models: true } });
  const sparePartCategories = await prisma.category.findMany();

  if (aircraftCategories.length === 0 || brandsWithModels.length === 0 || sparePartCategories.length === 0) {
    throw new Error('No se encontró la taxonomía. Por favor, ejecuta primero seed-taxonomy.ts');
  }

  // Helpers para elementos random
  const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
  const getRandomPrice = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
  const randomBoolean = () => Math.random() < 0.5;

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + 45); // 45 días de vigencia

  // 2. Crear 10 Publicaciones de Aviones
  console.log('Creando 10 publicaciones de aviones con campos avanzados...');
  for (let i = 1; i <= 10; i++) {
    const seller = getRandom(createdUsers);
    const category = getRandom(aircraftCategories);
    
    // Buscar una marca que tenga modelos cargados
    const validBrands = brandsWithModels.filter(b => b.models.length > 0);
    const brand = getRandom(validBrands);
    const model = getRandom(brand.models);
    const isCertified = randomBoolean();

    await prisma.aircraft.create({
      data: {
        sellerId: seller.id,
        title: `${brand.name} ${model.name} en excelente estado (Mock ${i})`,
        description: `Esta es una publicación de prueba generada automáticamente. El avión cuenta con todo el mantenimiento al día, listo para transferir. Excelente oportunidad.`,
        categoryId: category.id,
        brandId: brand.id,
        modelId: model.id,
        condition: i % 2 === 0 ? AircraftCondition.NUEVO : AircraftCondition.USADO,
        year: getRandomPrice(1970, 2024),
        totalTimeHours: getRandomPrice(500, 8000),
        price: getRandomPrice(50000, 1500000),
        
        // Opciones de Negociación aleatorias
        trade: randomBoolean(),
        financing: randomBoolean(),
        rent: randomBoolean(),
        
        // Atributos y Equipamiento
        engineType: getRandom([EngineType.PISTON, EngineType.TURBOPROP]),
        certified: isCertified,
        certDate: isCertified ? now : null,
        plate: `LV-X${getRandomPrice(10, 99)}`,
        passengers: getRandomPrice(2, 10),
        airconditioner: randomBoolean(),
        oxygen: randomBoolean(),
        
        // Descripciones específicas
        avDescription: 'Garmin G1000, doble NAV/COM, Transponder GTX 327. Panel estándar en excelente estado.',
        avAaptoifr: randomBoolean(),
        avAutopilot: randomBoolean(),
        intDescription: 'Tapizados de cuero color beige en un 8/10. Alfombras renovadas en 2022.',
        extDescription: 'Pintura original blanca con franjas azules y grises. Tratamiento cerámico.',
        
        city: seller.city || 'Ciudad',
        province: seller.province || 'Provincia',
        status: AircraftStatus.ACTIVE,
        listingStartsAt: now,
        listingExpiresAt: futureDate,

        // Creación de Motores (1 motor random)
        engines: {
          create: [{
            brand: getRandom(['Lycoming', 'Continental', 'Rotax']),
            model: `Modelo-${getRandomPrice(100, 500)}`,
            TBO: 2000,
            engineHours: getRandomPrice(100, 1900),
            DURG: getRandomPrice(0, 500),
            description: 'Cilindros y magnetos recorridos recientemente.'
          }]
        },

        // Creación de Hélice (1 hélice random)
        propeller: {
          create: [{
            model: `Hartzell HC-C2YR-${i}`,
            propellerHours: getRandomPrice(50, 1000),
            description: 'Overhaul realizado hace 100 horas.'
          }]
        },

        // Imágenes reales aleatorias de aviones
        images: {
          create: [
            { url: `https://loremflickr.com/800/600/aircraft?lock=${i}1`, order: 0 },
            { url: `https://loremflickr.com/800/600/aircraft?lock=${i}2`, order: 1 }
          ]
        }
      }
    });
  }

  // 3. Crear 15 Publicaciones de Repuestos
  console.log('Creando 15 publicaciones de repuestos...');
  const repuestosBrands = ['Garmin', 'Lycoming', 'Continental', 'Bendix', 'Hartzell', 'Champion'];
  const repuestosCondiciones = [SparepartCondition.NUEVO, SparepartCondition.USADO, SparepartCondition.RECORRIDO, SparepartCondition.REPARAR];

  for (let i = 1; i <= 15; i++) {
    const seller = getRandom(createdUsers);
    const category = getRandom(sparePartCategories);
    const isPesos = randomBoolean();

    await prisma.sparePart.create({
      data: {
        sellerId: seller.id,
        title: `Repuesto Aeronáutico ${getRandom(repuestosBrands)} - Lote ${i}`,
        brand: getRandom(repuestosBrands),
        description: `Repuesto de prueba (Mock) perteneciente a la categoría ${category.name}. Ideal para pruebas de diseño de UI y carga de tarjetas de producto.`,
        categoryId: category.id,
        condition: getRandom(repuestosCondiciones),
        partNumber: `PN-${getRandomPrice(1000, 9999)}-${i}`,
        price: isPesos ? getRandomPrice(50000, 500000) : getRandomPrice(100, 5000),
        inPesos: isPesos,
        stock: getRandomPrice(1, 15),
        
        // Aeronaves compatibles
        aircrafts: randomBoolean() ? ['Cessna 150', 'Cessna 172', 'Piper Cherokee'] : [],
        
        attributes: { origen: 'Importado', certificacion: 'Form 8130-3' }, 
        city: seller.city || 'Ciudad',
        province: seller.province || 'Provincia',
        status: SparePartStatus.ACTIVE,
        listingStartsAt: now,
        listingExpiresAt: futureDate,
        
        // Imágenes reales de maquinaria o partes
        images: {
          create: [
            { url: `https://loremflickr.com/600/600/machinery,tools?lock=${i}1`, order: 0 },
            { url: `https://loremflickr.com/600/600/machinery,tools?lock=${i}2`, order: 1 }
          ]
        }
      }
    });
  }

  console.log('✅ Mocks creados con éxito (10 Aviones, 15 Repuestos, 6 Usuarios).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });