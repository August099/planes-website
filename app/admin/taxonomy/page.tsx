import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { TaxonomyManager } from "@/components/ui/TaxonomyManager";

export default async function AdminTaxonomyPage() {
  const user = await getCurrentUser();

  if (!user || !user.isAdmin) {
    redirect("/");
  }

  type CategoryFlat = { id: string; name: string; icon: string | null; parentId: string | null };
  type CategoryTreeNode = CategoryFlat & { children: CategoryTreeNode[] };

  function buildCategoryTree(categories: CategoryFlat[], parentId: string | null = null): CategoryTreeNode[] {
    return categories
      .filter((c) => c.parentId === parentId)
      .map((c) => ({ ...c, children: buildCategoryTree(categories, c.id) }));
  }

  const [aircraftCategories, aircraftBrands, sparePartCategories, filterGroups] = await Promise.all([
    prisma.aircraftCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.aircraftBrand.findMany({
      select: {
        id: true,
        name: true,
        models: {
          select: {
            id: true,
            name: true,
            variants: { // Usa exactamente la relación 'variants' del Schema
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, icon: true, parentId: true },
      orderBy: { name: "asc" },
    }),
    prisma.filterGroup.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        order: true,
        categories: { select: { id: true } },
        filters: {
          where: { parentId: null }, // solo los de primer nivel acá arriba
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            order: true,
            config: true,
            options: {
              select: { id: true, label: true, value: true, order: true },
              orderBy: { order: "asc" },
            },
            children: { // ← nuevo: sub-filtros anidados
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                order: true,
                config: true,
                options: {
                  select: { id: true, label: true, value: true, order: true },
                  orderBy: { order: "asc" },
                },
              },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    }),
  ]);

  // Formateamos para hacer coincidir con las props del componente de cliente
  const formattedBrands = aircraftBrands.map((brand) => ({
    ...brand,
    models: brand.models.map((model) => ({
      id: model.id,
      name: model.name,
      subModels: model.variants,
    })),
  }));

  const sparePartCategoriesTree = buildCategoryTree(sparePartCategories);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Gestor de Categorías y Marcas</h1>
        <p className="text-xs text-slate-500">
          Añade, edita y elimina opciones para los desplegables de publicación y filtros.
        </p>
      </div>

      <TaxonomyManager
        aircraftCategories={aircraftCategories}
        aircraftBrands={formattedBrands}
        sparePartCategories={sparePartCategoriesTree}
        sparePartCategoriesFlat={sparePartCategories} 
        filterGroups={filterGroups}
      />
    </div>
  );
}