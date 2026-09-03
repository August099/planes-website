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

// Junta el id de una categoría + todos sus descendientes (para incluir en el filtro)
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
  node: CategoryRow & { children: any[] };
  selected: string[];
  onToggle: (id: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth === 0 ? false : true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 14 }}>
        {hasChildren ? (
          <button onClick={() => setExpanded((e) => !e)} className="text-gray-400 shrink-0">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" /> // espaciador para alinear con los que sí tienen flecha
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

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(searchParams.getAll("category"));

  // Estado de los filtros dinámicos: { [filterSlug]: string[] } para SELECT/MULTI_SELECT/BOOLEAN,
  // o { [filterSlug_min/max]: string } para NUMBER_RANGE
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    filterGroups.forEach((group) =>
      group.filters.forEach((filter) => {
        const values = searchParams.getAll(`filter_${filter.slug}`);
        if (values.length) initial[filter.slug] = values;
      })
    );
    return initial;
  });

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const categoryTree = useMemo(() => buildTree(categories), [categories]);

  // Todas las categorías seleccionadas + sus descendientes (para saber qué grupos de filtros aplican)
  const effectiveCategoryIds = useMemo(() => {
    const set = new Set<string>();
    categoryIds.forEach((id) => getDescendantIds(categories, id).forEach((d) => set.add(d)));
    return Array.from(set);
  }, [categoryIds, categories]);

  // Grupos de filtros que aplican a alguna de las categorías seleccionadas
  const applicableGroups = useMemo(() => {
    if (categoryIds.length === 0) return [];
    return filterGroups.filter((group) =>
      group.categories.some((c) => effectiveCategoryIds.includes(c.id))
    );
  }, [filterGroups, effectiveCategoryIds, categoryIds]);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const toggleFilterValue = (slug: string, value: string, multi: boolean) => {
    setDynamicFilters((prev) => {
      const current = prev[slug] ?? [];
      if (multi) {
        const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
        return { ...prev, [slug]: next };
      }
      // single-select: reemplaza el valor, o lo saca si ya estaba
      return { ...prev, [slug]: current.includes(value) ? [] : [value] };
    });
  };

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    categoryIds.forEach((c) => params.append("category", c));
    Object.entries(dynamicFilters).forEach(([slug, values]) => {
      values.forEach((v) => params.append(`filter_${slug}`, v));
    });
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }, [minPrice, maxPrice, categoryIds, dynamicFilters, router, pathname]);

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setCategoryIds([]);
    setDynamicFilters({});
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(
    minPrice || maxPrice || categoryIds.length || Object.values(dynamicFilters).some((v) => v.length)
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

      {/* Árbol de categorías, colapsable */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Categoría</h3>
        <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
          {categoryTree.map((node) => (
            <CategoryNode key={node.id} node={node} selected={categoryIds} onToggle={toggleCategory} />
          ))}
        </div>
      </div>

      {/* Filtros dinámicos, solo si hay categoría seleccionada */}
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
                  className="flex items-center justify-between text-sm font-medium"
                >
                  {group.name}
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <div className="flex flex-col gap-3 pl-1">
                    {group.filters.map((filter) => (
                      <div key={filter.id} className="flex flex-col gap-1.5">
                        <span className="text-xs text-gray-500">{filter.name}</span>

                        {filter.type === "RANGE" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Mín"
                              value={dynamicFilters[`${filter.slug}_min`]?.[0] ?? ""}
                              onChange={(e) =>
                                setDynamicFilters((prev) => ({
                                  ...prev,
                                  [`${filter.slug}_min`]: e.target.value ? [e.target.value] : [],
                                }))
                              }
                              className="w-full px-2 py-1 border rounded-md text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Máx"
                              value={dynamicFilters[`${filter.slug}_max`]?.[0] ?? ""}
                              onChange={(e) =>
                                setDynamicFilters((prev) => ({
                                  ...prev,
                                  [`${filter.slug}_max`]: e.target.value ? [e.target.value] : [],
                                }))
                              }
                              className="w-full px-2 py-1 border rounded-md text-sm"
                            />
                          </div>
                        ) : filter.type === "BOOLEAN" ? (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={dynamicFilters[filter.slug]?.includes("true") ?? false}
                              onCheckedChange={() => toggleFilterValue(filter.slug, "true", false)}
                            />
                            Sí
                          </label>
                        ) : (
                          filter.options.map((option) => (
                            <label key={option.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={dynamicFilters[filter.slug]?.includes(option.value) ?? false}
                                onCheckedChange={() =>
                                  toggleFilterValue(filter.slug, option.value, filter.type === "MULTI_SELECT")
                                }
                              />
                              {option.label}
                            </label>
                          ))
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