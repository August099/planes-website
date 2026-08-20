"use client";

import { AircraftBrand, AircraftCategory } from "@prisma/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

export function PlanesFiltersSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [categories, setCategories] = useState<string[]>(
    searchParams.getAll("category")
  );
  const [brands, setBrands] = useState<string[]>(searchParams.getAll("brand"));
  const [models, setModels] = useState<string[]>(searchParams.getAll("model"));
  const [province, setProvince] = useState(searchParams.get("province") ?? "");

  //const aircraftCategories = Object.values(AircraftCategory).map(cat => cat.toLowerCase().replaceAll("_", " "))
  //const aircraftBrands = Object.values(AircraftBrand).map(brand => brand.toLowerCase().replaceAll("_", " "))

  const toggleValue = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  };

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();

    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (province) params.set("province", province);
    categories.forEach((c) => params.append("category", c));
    brands.forEach((b) => params.append("brand", b));

    router.push(`${pathname}?${params.toString()}`);
  }, [minPrice, maxPrice, province, categories, brands, router, pathname]);

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setCategories([]);
    setBrands([]);
    setProvince("");
    router.push(pathname);
  };

  const hasActiveFilters =
    minPrice || maxPrice || province || categories.length > 0 || brands.length > 0;

  return (
    <aside className="w-full lg:w-72 shrink-0 border rounded-xl p-5 h-fit sticky top-4 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filtros</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Precio (USD)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Mín"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Máx"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm"
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Marca</h3>
        <div className="flex flex-col gap-1.5">
          {aircraftBrands.map((brand) => (
            <label key={brand} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={brands.includes(brand)}
                onChange={() => toggleValue(brands, setBrands, brand)}
                className="rounded"
              />
              {brand}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Categoría</h3>
        <div className="flex flex-col gap-1.5">
          {aircraftCategories.map((cat) => (
            <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={categories.includes(cat)}
                onChange={() => toggleValue(categories, setCategories, cat)}
                className="rounded"
              />
              {cat}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Provincia</h3>
        <input
          type="text"
          placeholder="Ej: Buenos Aires"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="w-full px-2 py-1.5 border rounded-md text-sm"
        />
      </div>

      <Separator />

      <button
        onClick={applyFilters}
        className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Aplicar filtros
      </button>
    </aside>
  );
}