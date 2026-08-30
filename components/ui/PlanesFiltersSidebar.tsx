"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown, ChevronRight } from "lucide-react";

type SubModel = { id: string; name: string };
type Model = { id: string; name: string; variants: SubModel[] };
type Brand = { id: string; name: string; models: Model[] };
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

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(searchParams.getAll("category"));
  const [brandIds, setBrandIds] = useState<string[]>(searchParams.getAll("brand"));
  const [modelIds, setModelIds] = useState<string[]>(searchParams.getAll("model"));
  const [subModelIds, setSubModelIds] = useState<string[]>(searchParams.getAll("subModel"));
  const [condition, setCondition] = useState<string[]>(searchParams.getAll("condition"));

  // Qué marcas están con su lista de modelos desplegada en el acordeón
  const [expandedBrands, setExpandedBrands] = useState<string[]>([]);

  // --- La parte clave: modelos disponibles según las marcas tildadas ---
  const availableModels = useMemo(() => {
    if (brandIds.length === 0) return [];
    return brands
      .filter((b) => brandIds.includes(b.id))
      .flatMap((b) => b.models.map((m) => ({ ...m, brandName: b.name })));
  }, [brandIds, brands]);

  const availableSubModels = useMemo(() => {
    if (modelIds.length === 0) return [];
    return availableModels
      .filter((m) => modelIds.includes(m.id))
      .flatMap((m) => m.variants.map((v) => ({ ...v, modelName: m.name })));
  }, [modelIds, availableModels]);

  const toggleValue = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  // Al destildar una marca, hay que limpiar los modelos/submodelos que dependían de ella
  const toggleBrand = (brandId: string) => {
    const isRemoving = brandIds.includes(brandId);
    const newBrandIds = toggleValue(brandIds, setBrandIds, brandId) as unknown as void;

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

  // Al destildar un modelo, limpiar sus submodelos
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
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }, [minPrice, maxPrice, categoryIds, brandIds, modelIds, subModelIds, condition, router, pathname]);

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setCategoryIds([]);
    setBrandIds([]);
    setModelIds([]);
    setSubModelIds([]);
    setCondition([]);
    setExpandedBrands([]);
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(
    minPrice || maxPrice || categoryIds.length || brandIds.length || modelIds.length || condition.length
  )

  return (
    <aside className="w-full lg:w-72 shrink-0 border border-[#001F58]/10 bg-[var(--primary-foreground)] rounded-xl p-5 h-fit flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filtros</h2>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600">
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

      {/* Categoría */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Categoría</h3>
        <div className="flex flex-col gap-1.5">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1">
              <Checkbox
                id={`cat-${cat.id}`}
                checked={categoryIds.includes(cat.id)}
                onCheckedChange={() => toggleValue(categoryIds, setCategoryIds, cat.id)}
              />
              <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer flex-1">
                {cat.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Marca → despliega Modelos → despliega Submodelos */}
      
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
                  <label htmlFor={`brand-${brand.id}`} className="text-sm cursor-pointer flex-1">
                    {brand.name}
                  </label>
                  {isSelected && brand.models.length > 0 && (
                    <button
                      onClick={() =>
                        setExpandedBrands((prev) =>
                          isExpanded ? prev.filter((id) => id !== brand.id) : [...prev, brand.id]
                        )
                      }
                      className="text-primary mr-3"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Modelos — solo aparecen si la marca está tildada y expandida */}
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
                            <label htmlFor={`model-${model.id}`} className="text-sm cursor-pointer flex-1">
                              {model.name}
                            </label>
                          </div>

                          {/* Submodelos — solo si el modelo está tildado */}
                          {modelSelected && model.variants.length > 0 && (
                            <div className="ml-6 flex flex-col gap-1 border-l pl-3 mt-1">
                              {model.variants.map((variant) => (
                                <div key={variant.id} className="flex items-center gap-1">
                                  <Checkbox
                                    id={`variant-${variant.id}`}
                                    checked={subModelIds.includes(variant.id)}
                                    onCheckedChange={() => toggleValue(subModelIds, setSubModelIds, variant.id)}
                                  />
                                  <label htmlFor={`variant-${variant.id}`} className="text-sm cursor-pointer flex-1">
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

      {/* Condición */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Condición</h3>
        <div className="flex flex-col gap-1.5">
          {["NUEVO", "USADO"].map((cond) => (
            <div key={cond} className="flex items-center gap-1">
              <Checkbox
                id={`cond-${cond}`}
                checked={condition.includes(cond)}
                onCheckedChange={() => toggleValue(condition, setCondition, cond)}
              />
              <label htmlFor={`cond-${cond}`} className="text-sm cursor-pointer flex-1">
                {cond === "NUEVO" ? "Nuevo" : "Usado"}
              </label>
            </div>
          ))}
        </div>
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