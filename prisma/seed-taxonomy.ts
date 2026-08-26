import { prisma } from '../lib/prisma'; 
import fs from 'fs';

async function main() {
  console.log('🚀 Iniciando la carga de Taxonomía de Producción...');

  // Verificar si la base de datos está conectada viendo un log rápido
  if (!process.env.DATABASE_URL) {
    throw new Error("❌ DATABASE_URL está vacío. Acordate de usar --env-file=.env al ejecutar el script.");
  }

  // Leer el archivo JSON
  const rawData = fs.readFileSync(new URL('./data/seed_data.json', import.meta.url), 'utf-8');
  const dbData = JSON.parse(rawData);

  // 1. Cargar Categorías de Aeronaves
  console.log('Cargando Categorías de Aeronaves...');
  for (const cat of dbData.AircraftCategories) {
    await prisma.aircraftCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { id: cat.id, name: cat.name },
    });
  }

  // 2. Cargar Marcas y Modelos
  console.log('Cargando Marcas, Modelos y Submodelos...');
  for (const brand of dbData.AircraftBrands) {
    const createdBrand = await prisma.aircraftBrand.upsert({
      where: { name: brand.name },
      update: {},
      create: { name: brand.name },
    });

    for (const model of brand.models) {
      const createdModel = await prisma.aircraftModel.upsert({
        where: { brandId_name: { brandId: createdBrand.id, name: model.name } },
        update: {},
        create: { brandId: createdBrand.id, name: model.name },
      });

      if (model.subModels) {
        for (const subModel of model.subModels) {
          await prisma.aircraftSubModel.upsert({
            where: { modelId_name: { modelId: createdModel.id, name: subModel.name } },
            update: {},
            create: { modelId: createdModel.id, name: subModel.name },
          });
        }
      }
    }
  }

  // 3. Cargar Repuestos (Árbol y Filtros)
  console.log('Cargando Categorías y Filtros de Repuestos...');
  async function processCategory(categoryData: any, parentId: string | null = null) {
    const category = await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: { parentId },
      create: { name: categoryData.name, slug: categoryData.slug, parentId },
    });

    if (categoryData.filters && categoryData.filters.length > 0) {
      const filterGroup = await prisma.filterGroup.upsert({
        where: { slug: `${categoryData.slug}-filters` },
        update: {},
        create: {
          name: `Filtros de ${categoryData.name}`,
          slug: `${categoryData.slug}-filters`,
          categories: { connect: { id: category.id } }
        },
      });

      for (const filterData of categoryData.filters) {
        const filter = await prisma.filter.upsert({
          where: { groupId_slug: { groupId: filterGroup.id, slug: filterData.slug } },
          update: {},
          create: {
            name: filterData.name,
            slug: filterData.slug,
            type: filterData.type,
            groupId: filterGroup.id,
            config: filterData.config ? filterData.config : undefined
          },
        });

        if (filterData.options) {
          for (const opt of filterData.options) {
            await prisma.filterOption.upsert({
              where: { filterId_value: { filterId: filter.id, value: opt } },
              update: {},
              create: { label: opt, value: opt, filterId: filter.id }
            });
          }
        }
      }
    }

    if (categoryData.children && categoryData.children.length > 0) {
      for (const child of categoryData.children) {
        await processCategory(child, category.id);
      }
    }
  }

  for (const sparePartCat of dbData.SparePartsCategories) {
    await processCategory(sparePartCat);
  }

  console.log('✅ Taxonomía cargada con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });