"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";

type SubModel = { id: string; name: string; categoryOverride?: string | null };
type Model = { id: string; name: string; defaultCategoryId?: string | null; variants: SubModel[] };
type Brand = { id: string; name: string; logoUrl?: string | null; models: Model[] };
type Category = { id: string; name: string };

export function FiltersSidebar({
  categories,
  brands,
}: {
  categories: Category[];
  brands: Brand[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(searchParams.getAll("category"));
  const [brandIds, setBrandIds] = useState<string[]>(searchParams.getAll("brand"));
  const [modelIds, setModelIds] = useState<string[]>(searchParams.getAll("model"));
  const [subModelIds, setSubModelIds] = useState<string[]>(searchParams.getAll("subModel"));
  const [condition, setCondition] = useState<string[]>(searchParams.getAll("condition"));
  const [financing, setFinancing] = useState(searchParams.get("financing") === "true");
  const [trade, setTrade] = useState(searchParams.get("trade") === "true");
  const [rent, setRent] = useState(searchParams.get("rent") === "true");

  const [expandedBrands, setExpandedBrands] = useState<string[]>([]);

  const availableModels = useMemo(() => {
    if (brandIds.length === 0) return [];
    return brands
      .filter((b) => brandIds.includes(b.id))
      .flatMap((b) => b.models.map((m) => ({ ...m, brandName: b.name })));
  }, [brandIds, brands]);

  const toggleValue = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const toggleBrand = (brandId: string) => {
    const isRemoving = brandIds.includes(brandId);
    toggleValue(brandIds, setBrandIds, brandId);

    if (isRemoving) {
      const brand = brands.find((b) => b.id === brandId);
      const modelIdsToRemove = brand?.models.map((m) => m.id) ?? [];
      setModelIds((prev) => prev.filter((id) => !modelIdsToRemove.includes(id)));

      const subModelIdsToRemove = brand?.models.flatMap((m) => m.variants.map((v) => v.id)) ?? [];
      setSubModelIds((prev) => prev.filter((id) => !subModelIdsToRemove.includes(id)));

      setExpandedBrands((prev) => prev.filter((id) => id !== brandId));
    } else {
      setExpandedBrands((prev) => [...prev, brandId]);
    }
  };

  const toggleModel = (modelId: string) => {
    const isRemoving = modelIds.includes(modelId);
    toggleValue(modelIds, setModelIds, modelId);

    if (isRemoving) {
      const model = availableModels.find((m) => m.id === modelId);
      const subIdsToRemove = model?.variants.map((v) => v.id) ?? [];
      setSubModelIds((prev) => prev.filter((id) => !subIdsToRemove.includes(id)));
    }
  };

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();

    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    categoryIds.forEach((c) => params.append("category", c));
    brandIds.forEach((b) => params.append("brand", b));
    modelIds.forEach((m) => params.append("model", m));
    subModelIds.forEach((s) => params.append("subModel", s));
    condition.forEach((c) => params.append("condition", c));
    if (financing) params.set("financing", "true");
    if (trade) params.set("trade", "true");
    if (rent) params.set("rent", "true");
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
    setIsOpenMobile(false);
  }, [minPrice, maxPrice, categoryIds, brandIds, modelIds, subModelIds, condition, financing, trade, rent, router, pathname]);

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setCategoryIds([]);
    setBrandIds([]);
    setModelIds([]);
    setSubModelIds([]);
    setCondition([]);
    setFinancing(false);
    setTrade(false);
    setRent(false);
    setExpandedBrands([]);
    router.push(pathname);
    setIsOpenMobile(false);
  };

  const activeFilterCount =
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    categoryIds.length +
    brandIds.length +
    modelIds.length +
    subModelIds.length +
    condition.length +
    (financing ? 1 : 0) +
    (trade ? 1 : 0) +
    (rent ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const filterContent = (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filtros</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      <Separator />

      {/* Precio */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Precio (USD)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Mín"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm bg-white"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Máx"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm bg-white"
          />
        </div>
      </div>

      <Separator />

      {/* Categoría */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Categoría</h3>
        <div className="flex flex-col gap-1.5">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${cat.id}`}
                checked={categoryIds.includes(cat.id)}
                onCheckedChange={() => toggleValue(categoryIds, setCategoryIds, cat.id)}
              />
              <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer flex-1 select-none">
                {cat.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Marca / Modelo / Submodelo */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Marca</h3>
        <div className="flex flex-col gap-1 max-h-[280px] overflow-y-auto pr-1">
          {brands.map((brand) => {
            const isSelected = brandIds.includes(brand.id);
            const isExpanded = expandedBrands.includes(brand.id);

            return (
              <div key={brand.id} className="flex flex-col">
                <div className="flex items-center gap-1">
                  <Checkbox
                    id={`brand-${brand.id}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleBrand(brand.id)}
                  />
                  <label htmlFor={`brand-${brand.id}`} className="text-sm cursor-pointer flex-1 select-none">
                    {brand.name}
                  </label>
                  {isSelected && brand.models.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBrands((prev) =>
                          isExpanded ? prev.filter((id) => id !== brand.id) : [...prev, brand.id]
                        )
                      }
                      className="text-primary mr-3 p-1"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {isSelected && isExpanded && (
                  <div className="ml-6 mt-1 flex flex-col gap-1 border-l pl-3">
                    {brand.models.map((model) => {
                      const modelSelected = modelIds.includes(model.id);
                      return (
                        <div key={model.id} className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <Checkbox
                              id={`model-${model.id}`}
                              checked={modelSelected}
                              onCheckedChange={() => toggleModel(model.id)}
                            />
                            <label htmlFor={`model-${model.id}`} className="text-sm cursor-pointer flex-1 select-none">
                              {model.name}
                            </label>
                          </div>

                          {modelSelected && model.variants.length > 0 && (
                            <div className="ml-6 flex flex-col gap-1 border-l pl-3 mt-1">
                              {model.variants.map((variant) => (
                                <div key={variant.id} className="flex items-center gap-1">
                                  <Checkbox
                                    id={`variant-${variant.id}`}
                                    checked={subModelIds.includes(variant.id)}
                                    onCheckedChange={() => toggleValue(subModelIds, setSubModelIds, variant.id)}
                                  />
                                  <label htmlFor={`variant-${variant.id}`} className="text-sm cursor-pointer flex-1 select-none">
                                    {variant.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Opciones adicionales */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Opciones</h3>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Checkbox id="financing" checked={financing} onCheckedChange={() => setFinancing((v) => !v)} />
            <label htmlFor="financing" className="text-sm cursor-pointer flex-1 select-none">
              Acepta financiación
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="trade" checked={trade} onCheckedChange={() => setTrade((v) => !v)} />
            <label htmlFor="trade" className="text-sm cursor-pointer flex-1 select-none">
              Acepta permuta
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="rent" checked={rent} onCheckedChange={() => setRent((v) => !v)} />
            <label htmlFor="rent" className="text-sm cursor-pointer flex-1 select-none">
              Disponible para alquiler
            </label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Condición */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Condición</h3>
        <div className="flex flex-col gap-1.5">
          {["NUEVO", "USADO"].map((cond) => (
            <div key={cond} className="flex items-center gap-2">
              <Checkbox
                id={`cond-${cond}`}
                checked={condition.includes(cond)}
                onCheckedChange={() => toggleValue(condition, setCondition, cond)}
              />
              <label htmlFor={`cond-${cond}`} className="text-sm cursor-pointer flex-1 select-none">
                {cond === "NUEVO" ? "Nuevo" : "Usado"}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <button
        type="button"
        onClick={applyFilters}
        className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Aplicar filtros
      </button>
    </>
  );

  return (
    <>
      {/* Botón Flotante/Superior para Abrir Filtros en Móviles (< lg) */}
      <div className="w-full lg:hidden mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpenMobile(true)}
          className="flex items-center gap-2 bg-white border border-slate-300 shadow-sm px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-primary text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-red-600 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Panel Lateral Flotante para Móviles (< lg) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Fondo oscuro deslizable */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpenMobile(false)}
          />

          {/* Drawer / Modal lateral */}
          <div className="relative ml-auto w-full max-w-xs bg-[var(--primary-foreground)] h-full p-5 overflow-y-auto flex flex-col gap-5 shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-semibold text-base">Filtros de Búsqueda</span>
              <button
                type="button"
                onClick={() => setIsOpenMobile(false)}
                className="p-1 text-gray-500 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {filterContent}
          </div>
        </div>
      )}

      {/* Sidebar Fijo para Desktop (>= lg) */}
      <aside className="hidden lg:flex w-72 shrink-0 border border-[#001F58]/10 bg-[var(--primary-foreground)] rounded-xl p-5 h-fit flex-col gap-5">
        {filterContent}
      </aside>
    </>
  );
}