import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { TaxonomyManager } from "@/components/ui/TaxonomyManager";

export default async function AdminTaxonomyPage() {
  const user = await getCurrentUser();

  if (!user || !user.isAdmin) {
    redirect("/");
  }

  const [aircraftCategories, aircraftBrands, sparePartCategories] = await Promise.all([
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
      where: { parentId: null },
      select: {
        id: true,
        name: true,
        icon: true,
        children: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
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
        sparePartCategories={sparePartCategories}
      />
    </div>
  );
}