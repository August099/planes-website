// components/ui/AircraftFiltersWrapper.tsx
import { FiltersSidebar } from "./PlanesFiltersSidebar";

type SubModel = { id: string; name: string };
type Model = { id: string; name: string; variants: SubModel[] };
type Brand = { id: string; name: string; models: Model[] };
type Category = { id: string; name: string };

export function AircraftFiltersWrapper({
  categories,
  brands,
}: {
  categories: Category[];
  brands: Brand[];
}) {
  return <FiltersSidebar categories={categories} brands={brands} />;
}