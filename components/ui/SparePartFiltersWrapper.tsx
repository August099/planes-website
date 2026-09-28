import { prisma } from "@/lib/prisma";
import { SparePartFiltersSidebar } from "./SparePartFiltersSidebar";

export async function SparePartFiltersWrapper() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, parentId: true, icon: true },
    orderBy: { name: "asc" },
  });

  return <SparePartFiltersSidebar categories={categories} />;
}