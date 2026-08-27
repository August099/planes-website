import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import PublishForm from "@/components/ui/PublishForm";

export const dynamic = "force-dynamic";

export default async function PublishPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?callbackUrl=/publish");
  }

  const rawBrands = await prisma.aircraftBrand.findMany({
    select: {
      id: true,
      name: true,
      models: {
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const rawCategories = await prisma.aircraftCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Obtener solo las categorías raíz (parentId === null) e incluir sus subcategorías (children)
  // Ejemplo para otras páginas porque me pioló
  const rawSpareCategories = await prisma.category.findMany({
    where: {
      parentId: null, // Categorías principales
    },
    select: {
      id: true,
      name: true,
      children: {
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const spareCategoriesData = JSON.parse(JSON.stringify(rawSpareCategories));

  return (
    <main className="min-h-screen">
      <PublishForm
        userId={user.id}
        brandsData={JSON.parse(JSON.stringify(rawBrands))}
        categoriesData={JSON.parse(JSON.stringify(rawCategories))}
        spareCategoriesData={JSON.parse(JSON.stringify(rawSpareCategories))}
      />
    </main>
  );
}