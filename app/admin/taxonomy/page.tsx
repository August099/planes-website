import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { TaxonomyManager } from "@/components/ui/TaxonomyManager";

export default async function AdminTaxonomyPage() {
  const user = await getCurrentUser();

  if (!user || !user.isAdmin) {
    redirect("/");
  }

  const [aircraftBrands, sparePartCategories] = await Promise.all([
    prisma.aircraftBrand.findMany({
      select: {
        id: true,
        name: true,
        models: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Gestor de Categorías y Marcas</h1>
        <p className="text-xs text-slate-500">
          Añade nuevas opciones para los desplegables de publicación y filtros.
        </p>
      </div>

      <TaxonomyManager
        aircraftBrands={aircraftBrands}
        sparePartCategories={sparePartCategories}
      />
    </div>
  );
}