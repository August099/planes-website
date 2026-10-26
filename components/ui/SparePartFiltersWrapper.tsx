import { getSparePartCategories } from "@/lib/cached-data";
import { SparePartFiltersSidebar } from "./SparePartFiltersSidebar";

export async function SparePartFiltersWrapper() {
  // Misma lista cacheada que usa /spareparts para el filtro (VA-13).
  const categories = await getSparePartCategories();

  return <SparePartFiltersSidebar categories={categories} />;
}