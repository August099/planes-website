import { prisma } from "@/lib/prisma";
import { SparePartFiltersSidebar } from "./SparePartFiltersSidebar";

export async function SparePartFiltersWrapper() {
  const [categories, filterGroups] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.filterGroup.findMany({
      orderBy: { order: "asc" },
      include: {
        categories: { select: { id: true } },
        filters: {
          orderBy: { order: "asc" },
          where: { parentId: null }, // solo filtros de primer nivel por ahora
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    }),
  ]);

  return <SparePartFiltersSidebar categories={categories} filterGroups={filterGroups} />;
}