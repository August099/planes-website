"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AIRCRAFT_GROUPS, ENGINE_LABELS, categoryDef } from "@/lib/aircraft-categories";
import { FilterShell, FilterSection, AppliedFilterChips, ProvinceFilterSelect } from "@/components/ui/filters/FilterShell";
import { provinceBySlug, provinceShortName } from "@/lib/provinces";

type SubModel = { id: string; name: string; categoryOverride?: string | null };
type Model = { id: string; name: string; defaultCategoryId?: string | null; variants: SubModel[] };
type Brand = { id: string; name: string; logoUrl?: string | null; models: Model[] };
type Category = { id: string; name: string };

type SectionKey = "price" | "year" | "category" | "brand" | "province" | "seller" | "options" | "condition";
type Props = { categories: Category[]; brands: Brand[] };

const OPTION_LABELS: Record<string, string> = {
  financing: "Acepta financiación",
  trade: "Acepta permuta",
  rent: "Disponible para alquiler",
};

// "Publica" (VA-45): tipo de cuenta del vendedor (User.userType).
const SELLER_TYPE_LABELS: Record<string, string> = {
  PARTICULAR: "Particular",
  RESELLER: "Intermediario",
  FACTORY: "Fábrica",
};

const BRANDS_VISIBLE = 6;

// El estado del formulario se arma desde la URL. Con la key, cada cambio de URL (Home, volver
// atrás, búsqueda del header) vuelve a armarlo en vez de quedar con lo del primer montaje (VA-31).
export function FiltersSidebar(props: Props) {
  const searchParams = useSearchParams();
  return <FiltersSidebarForm key={searchParams.toString()} {...props} />;
}

function FiltersSidebarForm({ categories, brands }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [minYear, setMinYear] = useState(searchParams.get("minYear") ?? "");
  const [maxYear, setMaxYear] = useState(searchParams.get("maxYear") ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(searchParams.getAll("category"));
  const [brandIds, setBrandIds] = useState<string[]>(searchParams.getAll("brand"));
  const [modelIds, setModelIds] = useState<string[]>(searchParams.getAll("model"));
  const [subModelIds, setSubModelIds] = useState<string[]>(searchParams.getAll("subModel"));
  const [sellerTypes, setSellerTypes] = useState<string[]>(searchParams.getAll("sellerType"));
  const [condition, setCondition] = useState<string[]>(searchParams.getAll("condition"));
  const [financing, setFinancing] = useState(searchParams.get("financing") === "true");
  const [trade, setTrade] = useState(searchParams.get("trade") === "true");
  const [rent, setRent] = useState(searchParams.get("rent") === "true");
  const [province, setProvince] = useState(searchParams.get("province") ?? "");

  // Las secciones con filtros activos arrancan abiertas, así se ve qué está aplicado (VA-31).
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(() => ({
    price: searchParams.has("minPrice") || searchParams.has("maxPrice"),
    year: searchParams.has("minYear") || searchParams.has("maxYear"),
    category: searchParams.has("category"),
    brand: searchParams.has("brand") || searchParams.has("model") || searchParams.has("subModel"),
    province: searchParams.has("province"),
    seller: searchParams.has("sellerType"),
    options: ["financing", "trade", "rent"].some((key) => searchParams.get(key) === "true"),
    condition: searchParams.has("condition"),
  }));
  const toggleSection = (section: SectionKey) => setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const [expandedBrands, setExpandedBrands] = useState<string[]>(() => searchParams.getAll("brand"));
  const [showAllBrands, setShowAllBrands] = useState(false);

  // Las marcas aplicadas (URL) van primero, para que no queden escondidas en la lista.
  const sortedBrands = useMemo(() => {
    const applied = new Set(searchParams.getAll("brand"));
    return [...brands.filter((b) => applied.has(b.id)), ...brands.filter((b) => !applied.has(b.id))];
  }, [brands, searchParams]);
  // De entrada se ven 6 (o todas las aplicadas, si son más); "Ver todas (N)" muestra el resto.
  const visibleBrands = showAllBrands
    ? sortedBrands
    : sortedBrands.slice(0, Math.max(BRANDS_VISIBLE, searchParams.getAll("brand").length));

  const availableModels = useMemo(() => {
    if (brandIds.length === 0) return [];
    return brands.filter((b) => brandIds.includes(b.id)).flatMap((b) => b.models.map((m) => ({ ...m, brandName: b.name })));
  }, [brandIds, brands]);

  // Categorías agrupadas como en lib/aircraft-categories.ts. Solo las que existen en la base.
  const categoryGroups = useMemo(() => {
    const known = new Set(categories.map((c) => c.id));
    return AIRCRAFT_GROUPS.map((group) => ({
      group,
      items: categories.filter((c) => known.has(c.id) && categoryDef(c.id)?.group === group),
    }))
      .filter((g) => g.items.length > 0)
      // Categorías de la base que no están en el mapa: se muestran solas, con su nombre.
      .concat(categories.filter((c) => !categoryDef(c.id)).map((c) => ({ group: c.name, items: [c] })));
  }, [categories]);

  // Tildar el grupo = tildar todas sus subcategorías (y destildarlo, destildarlas).
  const toggleCategoryGroup = (ids: string[]) => {
    const allSelected = ids.every((id) => categoryIds.includes(id));
    setCategoryIds(allSelected ? categoryIds.filter((id) => !ids.includes(id)) : [...new Set([...categoryIds, ...ids])]);
  };

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
    // Se conserva el orden elegido (sort); el resto sale del formulario.
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (minYear) params.set("minYear", minYear);
    if (maxYear) params.set("maxYear", maxYear);
    categoryIds.forEach((c) => params.append("category", c));
    brandIds.forEach((b) => params.append("brand", b));
    modelIds.forEach((m) => params.append("model", m));
    subModelIds.forEach((s) => params.append("subModel", s));
    sellerTypes.forEach((t) => params.append("sellerType", t));
    condition.forEach((c) => params.append("condition", c));
    if (financing) params.set("financing", "true");
    if (trade) params.set("trade", "true");
    if (rent) params.set("rent", "true");
    if (province) params.set("province", province);
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
    setIsOpenMobile(false);
  }, [searchParams, minPrice, maxPrice, minYear, maxYear, categoryIds, brandIds, modelIds, subModelIds, sellerTypes, condition, financing, trade, rent, province, router, pathname]);

  const clearFilters = () => {
    const sort = searchParams.get("sort");
    router.push(sort ? `${pathname}?sort=${sort}` : pathname);
    setIsOpenMobile(false);
  };

  const counts = {
    price: (minPrice ? 1 : 0) + (maxPrice ? 1 : 0),
    year: (minYear ? 1 : 0) + (maxYear ? 1 : 0),
    category: categoryIds.length,
    brand: brandIds.length + modelIds.length + subModelIds.length,
    province: province ? 1 : 0,
    seller: sellerTypes.length,
    options: (financing ? 1 : 0) + (trade ? 1 : 0) + (rent ? 1 : 0),
    condition: condition.length,
  };
  const activeFilterCount = Object.values(counts).reduce((a, b) => a + b, 0);

  // Filtros aplicados (los de la URL), como etiquetas que se pueden quitar de a una.
  const appliedChips = useMemo(() => {
    const nameOf = new Map<string, string>();
    categories.forEach((c) => {
      const def = categoryDef(c.id);
      nameOf.set(`category:${c.id}`, def?.engine ? `${def.group} · ${ENGINE_LABELS[def.engine]}` : c.name);
    });
    brands.forEach((b) => {
      nameOf.set(`brand:${b.id}`, b.name);
      b.models.forEach((m) => {
        nameOf.set(`model:${m.id}`, m.name);
        m.variants.forEach((v) => nameOf.set(`subModel:${v.id}`, v.name));
      });
    });

    const chips: { key: string; value: string | null; label: string }[] = [];
    // Mismo orden que las secciones (VA-107): categoría, marca, año, precio, publica, provincia, condición, opciones.
    const usd = (v: string) => `USD ${Number(v).toLocaleString("es-AR")}`;
    for (const key of ["category", "brand", "model", "subModel"]) {
      for (const value of searchParams.getAll(key)) {
        chips.push({ key, value, label: nameOf.get(`${key}:${value}`) ?? value });
      }
    }
    const yMin = searchParams.get("minYear");
    const yMax = searchParams.get("maxYear");
    if (yMin) chips.push({ key: "minYear", value: null, label: `Año desde ${yMin}` });
    if (yMax) chips.push({ key: "maxYear", value: null, label: `Año hasta ${yMax}` });
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    if (min) chips.push({ key: "minPrice", value: null, label: `Desde ${usd(min)}` });
    if (max) chips.push({ key: "maxPrice", value: null, label: `Hasta ${usd(max)}` });
    for (const value of searchParams.getAll("sellerType")) {
      chips.push({ key: "sellerType", value, label: SELLER_TYPE_LABELS[value] ?? value });
    }
    const prov = provinceBySlug(searchParams.get("province"));
    if (prov) chips.push({ key: "province", value: null, label: provinceShortName(prov.name) });
    for (const value of searchParams.getAll("condition")) {
      chips.push({ key: "condition", value, label: value === "NUEVO" ? "Nuevo" : "Usado" });
    }
    for (const key of Object.keys(OPTION_LABELS)) {
      if (searchParams.get(key) === "true") chips.push({ key, value: null, label: OPTION_LABELS[key] });
    }
    return chips;
  }, [searchParams, categories, brands]);

  const removeChip = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.delete(key, value);
      // Sin la marca, sus modelos y variantes no tienen sentido.
      if (key === "brand") {
        const brand = brands.find((b) => b.id === value);
        brand?.models.forEach((m) => {
          params.delete("model", m.id);
          m.variants.forEach((v) => params.delete("subModel", v.id));
        });
      }
      if (key === "model") {
        const model = brands.flatMap((b) => b.models).find((m) => m.id === value);
        model?.variants.forEach((v) => params.delete("subModel", v.id));
      }
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const rangeInputs = (
    min: string,
    setMin: (v: string) => void,
    max: string,
    setMax: (v: string) => void,
    placeholders: [string, string],
    label: string
  ) => (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        aria-label={`${label} mínimo`}
        placeholder={placeholders[0]}
        value={min}
        onChange={(e) => setMin(e.target.value)}
        className="w-full px-2 py-2 border rounded-md text-sm bg-white"
      />
      <span className="text-gray-400">-</span>
      <input
        type="number"
        inputMode="numeric"
        aria-label={`${label} máximo`}
        placeholder={placeholders[1]}
        value={max}
        onChange={(e) => setMax(e.target.value)}
        className="w-full px-2 py-2 border rounded-md text-sm bg-white"
      />
    </div>
  );

  const checkRow = (id: string, checked: boolean, onChange: () => void, label: React.ReactNode, extraClass = "") => (
    <div key={id} className={`flex items-center gap-2 min-h-9 ${extraClass}`}>
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <label htmlFor={id} className="text-sm cursor-pointer flex-1 select-none py-1">
        {label}
      </label>
    </div>
  );

  return (
    <FilterShell onApply={applyFilters} activeCount={activeFilterCount} onClear={clearFilters} isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile}>
      <AppliedFilterChips chips={appliedChips} onRemove={removeChip} />

      <FilterSection title="Categoría" count={counts.category} open={openSections.category} onToggle={() => toggleSection("category")}>
        <div className="flex flex-col gap-0.5">
          {categoryGroups.map(({ group, items }) => {
            const ids = items.map((c) => c.id);
            return (
              <div key={group} className="flex flex-col">
                {checkRow(
                  `catgroup-${group}`,
                  ids.every((id) => categoryIds.includes(id)),
                  () => toggleCategoryGroup(ids),
                  items.length === 1 ? items[0].name : group
                )}
                {items.length > 1 &&
                  items.map((cat) => {
                    const engine = categoryDef(cat.id)?.engine;
                    return checkRow(
                      `cat-${cat.id}`,
                      categoryIds.includes(cat.id),
                      () => toggleValue(categoryIds, setCategoryIds, cat.id),
                      <span className="text-slate-600">{engine ? ENGINE_LABELS[engine] : cat.name}</span>,
                      "pl-6"
                    );
                  })}
              </div>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Marca" count={counts.brand} open={openSections.brand} onToggle={() => toggleSection("brand")}>
        <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto pr-1">
          {visibleBrands.map((brand) => {
            const isSelected = brandIds.includes(brand.id);
            const isExpanded = expandedBrands.includes(brand.id);
            return (
              <div key={brand.id} className="flex flex-col">
                <div className="flex items-center gap-2 min-h-9">
                  <Checkbox id={`brand-${brand.id}`} checked={isSelected} onCheckedChange={() => toggleBrand(brand.id)} />
                  <label htmlFor={`brand-${brand.id}`} className="text-sm cursor-pointer flex-1 select-none py-1">
                    {brand.name}
                  </label>
                  {isSelected && brand.models.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBrands((prev) => (isExpanded ? prev.filter((id) => id !== brand.id) : [...prev, brand.id]))
                      }
                      aria-label={isExpanded ? `Ocultar modelos de ${brand.name}` : `Ver modelos de ${brand.name}`}
                      className="text-primary mr-1 p-2 cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {isSelected && isExpanded && (
                  <div className="ml-6 mt-1 flex flex-col border-l pl-3">
                    {brand.models.map((model) => {
                      const modelSelected = modelIds.includes(model.id);
                      return (
                        <div key={model.id} className="flex flex-col">
                          {checkRow(`model-${model.id}`, modelSelected, () => toggleModel(model.id), model.name)}
                          {modelSelected && model.variants.length > 0 && (
                            <div className="ml-6 flex flex-col border-l pl-3">
                              {model.variants.map((variant) =>
                                checkRow(
                                  `variant-${variant.id}`,
                                  subModelIds.includes(variant.id),
                                  () => toggleValue(subModelIds, setSubModelIds, variant.id),
                                  variant.name
                                )
                              )}
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
        {sortedBrands.length > visibleBrands.length && (
          <button
            type="button"
            onClick={() => setShowAllBrands(true)}
            className="mt-1 text-sm font-medium text-primary hover:underline min-h-9 cursor-pointer"
          >
            Ver todas ({sortedBrands.length})
          </button>
        )}
        {showAllBrands && sortedBrands.length > BRANDS_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAllBrands(false)}
            className="mt-1 text-sm font-medium text-primary hover:underline min-h-9 cursor-pointer"
          >
            Ver menos
          </button>
        )}
      </FilterSection>

      <FilterSection title="Año" count={counts.year} open={openSections.year} onToggle={() => toggleSection("year")}>
        {rangeInputs(minYear, setMinYear, maxYear, setMaxYear, ["Desde", "Hasta"], "Año")}
      </FilterSection>

      <FilterSection title="Precio (USD)" count={counts.price} open={openSections.price} onToggle={() => toggleSection("price")}>
        {rangeInputs(minPrice, setMinPrice, maxPrice, setMaxPrice, ["Mín", "Máx"], "Precio")}
      </FilterSection>

      <FilterSection title="Publica" count={counts.seller} open={openSections.seller} onToggle={() => toggleSection("seller")}>
        <div className="flex flex-col gap-0.5">
          {Object.entries(SELLER_TYPE_LABELS).map(([value, label]) =>
            checkRow(`seller-${value}`, sellerTypes.includes(value), () => toggleValue(sellerTypes, setSellerTypes, value), label)
          )}
        </div>
      </FilterSection>

      <FilterSection title="Provincia" count={counts.province} open={openSections.province} onToggle={() => toggleSection("province")}>
        <ProvinceFilterSelect value={province} onChange={setProvince} />
      </FilterSection>

      <FilterSection title="Condición" count={counts.condition} open={openSections.condition} onToggle={() => toggleSection("condition")}>
        <div className="flex flex-col gap-0.5">
          {["NUEVO", "USADO"].map((cond) =>
            checkRow(`cond-${cond}`, condition.includes(cond), () => toggleValue(condition, setCondition, cond), cond === "NUEVO" ? "Nuevo" : "Usado")
          )}
        </div>
      </FilterSection>

      <FilterSection title="Opciones" count={counts.options} open={openSections.options} onToggle={() => toggleSection("options")}>
        <div className="flex flex-col gap-0.5">
          {checkRow("financing", financing, () => setFinancing((v) => !v), OPTION_LABELS.financing)}
          {checkRow("trade", trade, () => setTrade((v) => !v), OPTION_LABELS.trade)}
          {checkRow("rent", rent, () => setRent((v) => !v), OPTION_LABELS.rent)}
        </div>
      </FilterSection>
    </FilterShell>
  );
}
