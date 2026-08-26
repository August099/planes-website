import { PrismaClient, UserType, AircraftCondition, AircraftStatus, SparePartStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🛠️ Iniciando la generación de Mocks...');

  // 1. Crear Usuarios Mock
  console.log('Creando usuarios de prueba...');
  const usersToCreate = [
    { email: 'particular@test.com', name: 'Juan Perez', userType: UserType.PARTICULAR, city: 'Buenos Aires', province: 'Buenos Aires' },
    { email: 'reseller@test.com', name: 'AeroVentas S.A.', userType: UserType.RESELLER, city: 'Córdoba', province: 'Córdoba' },
    { email: 'factory@test.com', name: 'Repuestos Delta', userType: UserType.FACTORY, city: 'Mendoza', province: 'Mendoza' },
    { email: 'piloto1@test.com', name: 'Carlos Gomez', userType: UserType.PARTICULAR, city: 'Rosario', province: 'Santa Fe' },
    { email: 'admin@test.com', name: 'Admin Hangar', userType: UserType.PARTICULAR, isAdmin: true, city: 'CABA', province: 'CABA' },
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

  // Helper para elementos random
  const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
  const getRandomPrice = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

  // 2. Crear 20 Publicaciones de Aviones
  console.log('Creando 20 publicaciones de aviones...');
  for (let i = 1; i <= 20; i++) {
    const seller = getRandom(createdUsers);
    const category = getRandom(aircraftCategories);
    
    // Buscar una marca que tenga modelos cargados
    const validBrands = brandsWithModels.filter(b => b.models.length > 0);
    const brand = getRandom(validBrands);
    const model = getRandom(brand.models);

    await prisma.aircraft.create({
      data: {
        sellerId: seller.id,
        title: `${brand.name} ${model.name} en excelente estado (Mock ${i})`,
        description: `Esta es una publicación de prueba generada automáticamente. El avión cuenta con todo el mantenimiento al día, listo para transferir.`,
        categoryId: category.id,
        brandId: brand.id,
        modelId: model.id,
        condition: i % 2 === 0 ? AircraftCondition.NUEVO : AircraftCondition.USADO,
        year: getRandomPrice(1970, 2024),
        totalTimeHours: getRandomPrice(500, 8000),
        price: getRandomPrice(50000, 1500000),
        trade: i % 3 === 0, // 33% acepta permuta
        financing: i % 4 === 0, // 25% acepta financiación
        city: seller.city || 'Ciudad',
        province: seller.province || 'Provincia',
        status: AircraftStatus.ACTIVE, // Para que sean visibles en el frontend
        images: {
          create: [
            { url: `https://placehold.co/800x600/png?text=Avion+${i}+Foto+1`, order: 0 },
            { url: `https://placehold.co/800x600/png?text=Avion+${i}+Foto+2`, order: 1 }
          ]
        }
      }
    });
  }

  // 3. Crear 20 Publicaciones de Repuestos
  console.log('Creando 20 publicaciones de repuestos...');
  for (let i = 1; i <= 20; i++) {
    const seller = getRandom(createdUsers);
    const category = getRandom(sparePartCategories);

    await prisma.sparePart.create({
      data: {
        sellerId: seller.id,
        title: `Repuesto Original para Aeronáutica - Lote ${i}`,
        description: `Repuesto de prueba (Mock) perteneciente a la categoría ${category.name}. Ideal para pruebas de diseño de UI y carga de tarjetas de producto.`,
        categoryId: category.id,
        partNumber: `PN-${getRandomPrice(1000, 9999)}-${i}`,
        price: getRandomPrice(100, 5000),
        stock: getRandomPrice(1, 15),
        attributes: { condicion: 'Usado', origen: 'Importado' }, // Json dummy
        city: seller.city || 'Ciudad',
        province: seller.province || 'Provincia',
        status: SparePartStatus.ACTIVE, // Para que sean visibles
        images: {
          create: [
            { url: `https://placehold.co/600x600/png?text=Repuesto+${i}`, order: 0 }
          ]
        }
      }
    });
  }

  console.log('✅ Mocks creados con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });