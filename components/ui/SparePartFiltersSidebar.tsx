"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { FilterType } from "@prisma/client";

type CategoryRow = { id: string; name: string; parentId: string | null; icon: string | null };
type FilterOption = { id: string; label: string; value: string };
type FilterRow = {
  id: string;
  name: string;
  slug: string;
  type: FilterType;
  options: FilterOption[];
};
type FilterGroupRow = {
  id: string;
  name: string;
  filters: FilterRow[];
  categories: { id: string }[];
};

type CategoryTreeNode = CategoryRow & { children: CategoryTreeNode[] };

function buildTree(categories: CategoryRow[], parentId: string | null = null): CategoryTreeNode[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .map((c) => ({ ...c, children: buildTree(categories, c.id) }));
}

function getDescendantIds(categories: CategoryRow[], id: string): string[] {
  const directChildren = categories.filter((c) => c.parentId === id);
  return [id, ...directChildren.flatMap((c) => getDescendantIds(categories, c.id))];
}

function CategoryNode({
  node,
  selected,
  onToggle,
  depth = 0,
}: {
  node: CategoryTreeNode;
  selected: string[];
  onToggle: (id: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 14 }}>
        {hasChildren ? (
          <button onClick={() => setExpanded((e) => !e)} className="text-gray-400 shrink-0">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <Checkbox
          id={`cat-${node.id}`}
          checked={selected.includes(node.id)}
          onCheckedChange={() => onToggle(node.id)}
        />
        <label htmlFor={`cat-${node.id}`} className="text-sm cursor-pointer flex-1">
          {node.name}
        </label>
      </div>

      {hasChildren && expanded && (
        <div className="flex flex-col gap-1 mt-1">
          {node.children.map((child) => (
            <CategoryNode key={child.id} node={child} selected={selected} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// Un pequeño encabezado reutilizable, para que cada sección se lea igual y quede prolijo
function FilterSectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-700">{children}</h3>;
}

export function SparePartFiltersSidebar({
  categories,
  filterGroups,
}: {
  categories: CategoryRow[];
  filterGroups: FilterGroupRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currency, setCurrency] = useState<"ARS" | "USD">(
    (searchParams.get("currency") as "ARS" | "USD") ?? "USD"
  );
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(searchParams.getAll("category"));

  // Para SELECT y TEXT: un solo string por filtro.
  // Para MULTI_SELECT y RANGE(_min/_max): array (para MULTI_SELECT) o string suelto (para RANGE).
  const [selectValues, setSelectValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    filterGroups.forEach((group) =>
      group.filters.forEach((filter) => {
        if (filter.type === "SELECT" || filter.type === "TEXT") {
          const value = searchParams.get(`filter_${filter.slug}`);
          if (value) initial[filter.slug] = value;
        }
      })
    );
    return initial;
  });

  const [multiValues, setMultiValues] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    filterGroups.forEach((group) =>
      group.filters.forEach((filter) => {
        if (filter.type === "MULTI_SELECT") {
          const values = searchParams.getAll(`filter_${filter.slug}`);
          if (values.length) initial[filter.slug] = values;
        }
      })
    );
    return initial;
  });

  const [booleanValues, setBooleanValues] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    filterGroups.forEach((group) =>
      group.filters.forEach((filter) => {
        if (filter.type === "BOOLEAN" && searchParams.get(`filter_${filter.slug}`) === "true") {
          initial[filter.slug] = true;
        }
      })
    );
    return initial;
  });

  const [rangeValues, setRangeValues] = useState<Record<string, { min: string; max: string }>>(() => {
    const initial: Record<string, { min: string; max: string }> = {};
    filterGroups.forEach((group) =>
      group.filters.forEach((filter) => {
        if (filter.type === "RANGE") {
          const min = searchParams.get(`filter_${filter.slug}_min`) ?? "";
          const max = searchParams.get(`filter_${filter.slug}_max`) ?? "";
          if (min || max) initial[filter.slug] = { min, max };
        }
      })
    );
    return initial;
  });

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const categoryTree = useMemo(() => buildTree(categories), [categories]);

  const effectiveCategoryIds = useMemo(() => {
    const set = new Set<string>();
    categoryIds.forEach((id) => getDescendantIds(categories, id).forEach((d) => set.add(d)));
    return Array.from(set);
  }, [categoryIds, categories]);

  const applicableGroups = useMemo(() => {
    if (categoryIds.length === 0) return [];
    return filterGroups.filter((group) => group.categories.some((c) => effectiveCategoryIds.includes(c.id)));
  }, [filterGroups, effectiveCategoryIds, categoryIds]);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const toggleMultiValue = (slug: string, value: string) => {
    setMultiValues((prev) => {
      const current = prev[slug] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [slug]: next };
    });
  };

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set("currency", currency);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    categoryIds.forEach((c) => params.append("category", c));

    Object.entries(selectValues).forEach(([slug, value]) => {
      if (value) params.set(`filter_${slug}`, value);
    });
    Object.entries(multiValues).forEach(([slug, values]) => {
      values.forEach((v) => params.append(`filter_${slug}`, v));
    });
    Object.entries(booleanValues).forEach(([slug, checked]) => {
      if (checked) params.set(`filter_${slug}`, "true");
    });
    Object.entries(rangeValues).forEach(([slug, { min, max }]) => {
      if (min) params.set(`filter_${slug}_min`, min);
      if (max) params.set(`filter_${slug}_max`, max);
    });

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }, [currency, minPrice, maxPrice, categoryIds, selectValues, multiValues, booleanValues, rangeValues, router, pathname]);

  const clearFilters = () => {
    setCurrency("USD");
    setMinPrice("");
    setMaxPrice("");
    setCategoryIds([]);
    setSelectValues({});
    setMultiValues({});
    setBooleanValues({});
    setRangeValues({});
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(
    minPrice ||
      maxPrice ||
      categoryIds.length ||
      Object.values(selectValues).some(Boolean) ||
      Object.values(multiValues).some((v) => v.length) ||
      Object.values(booleanValues).some(Boolean) ||
      Object.values(rangeValues).some((r) => r.min || r.max)
  );

  return (
    <aside className="w-full lg:w-72 shrink-0 border rounded-xl p-5 h-fit sticky top-4 flex flex-col gap-5">
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

      {/* Precio + moneda juntos, para que quede claro que van de la mano */}
      <div className="flex flex-col gap-2">
        <FilterSectionTitle>Precio</FilterSectionTitle>

        <div className="flex rounded-md border overflow-hidden text-xs">
          <button
            onClick={() => setCurrency("USD")}
            className={`flex-1 py-1.5 font-medium transition-colors ${
              currency === "USD" ? "bg-primary text-white" : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Dólares (USD)
          </button>
          <button
            onClick={() => setCurrency("ARS")}
            className={`flex-1 py-1.5 font-medium transition-colors ${
              currency === "ARS" ? "bg-primary text-white" : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Pesos (ARS)
          </button>
        </div>

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
        <FilterSectionTitle>Categoría</FilterSectionTitle>
        <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
          {categoryTree.map((node) => (
            <CategoryNode key={node.id} node={node} selected={categoryIds} onToggle={toggleCategory} />
          ))}
        </div>
      </div>

      {/* Filtros dinámicos por categoría, cada tipo con su propio control */}
      {applicableGroups.length > 0 && (
        <>
          <Separator />
          {applicableGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.id);
            return (
              <div key={group.id} className="flex flex-col gap-2">
                <button
                  onClick={() =>
                    setExpandedGroups((prev) =>
                      isExpanded ? prev.filter((id) => id !== group.id) : [...prev, group.id]
                    )
                  }
                  className="flex items-center justify-between text-sm font-semibold text-slate-700"
                >
                  {group.name}
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <div className="flex flex-col gap-3 pl-1">
                    {group.filters.map((filter) => (
                      <div key={filter.id} className="flex flex-col gap-1.5">
                        <span className="text-xs text-gray-500">{filter.name}</span>

                        {/* SELECT: un <select> real, un solo valor posible */}
                        {filter.type === "SELECT" && (
                          <select
                            value={selectValues[filter.slug] ?? ""}
                            onChange={(e) =>
                              setSelectValues((prev) => ({ ...prev, [filter.slug]: e.target.value }))
                            }
                            className="w-full px-2 py-1.5 border rounded-md text-sm bg-white"
                          >
                            <option value="">Cualquiera</option>
                            {filter.options.map((option) => (
                              <option key={option.id} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* MULTI_SELECT: checkboxes, porque puede haber varios tildados */}
                        {filter.type === "MULTI_SELECT" && (
                          <div className="flex flex-col gap-1">
                            {filter.options.map((option) => (
                              <label key={option.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={multiValues[filter.slug]?.includes(option.value) ?? false}
                                  onCheckedChange={() => toggleMultiValue(filter.slug, option.value)}
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                        )}

                        {/* RANGE: dos inputs numéricos */}
                        {filter.type === "RANGE" && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Mín"
                              value={rangeValues[filter.slug]?.min ?? ""}
                              onChange={(e) =>
                                setRangeValues((prev) => ({
                                  ...prev,
                                  [filter.slug]: { ...prev[filter.slug], min: e.target.value, max: prev[filter.slug]?.max ?? "" },
                                }))
                              }
                              className="w-full px-2 py-1 border rounded-md text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Máx"
                              value={rangeValues[filter.slug]?.max ?? ""}
                              onChange={(e) =>
                                setRangeValues((prev) => ({
                                  ...prev,
                                  [filter.slug]: { ...prev[filter.slug], max: e.target.value, min: prev[filter.slug]?.min ?? "" },
                                }))
                              }
                              className="w-full px-2 py-1 border rounded-md text-sm"
                            />
                          </div>
                        )}

                        {/* BOOLEAN: un único checkbox Sí/No */}
                        {filter.type === "BOOLEAN" && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={booleanValues[filter.slug] ?? false}
                              onCheckedChange={() =>
                                setBooleanValues((prev) => ({ ...prev, [filter.slug]: !prev[filter.slug] }))
                              }
                            />
                            Sí
                          </label>
                        )}

                        {/* TEXT: input libre */}
                        {filter.type === "TEXT" && (
                          <input
                            type="text"
                            value={selectValues[filter.slug] ?? ""}
                            onChange={(e) =>
                              setSelectValues((prev) => ({ ...prev, [filter.slug]: e.target.value }))
                            }
                            placeholder="Buscar..."
                            className="w-full px-2 py-1.5 border rounded-md text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

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