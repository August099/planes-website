// components/ui/SparePartFiltersSidebar.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SparepartCondition } from "@prisma/client";
import { SPARE_PART_CONDITION_LABELS } from "@/lib/constants";
import { FilterShell, FilterSection, AppliedFilterChips } from "@/components/ui/filters/FilterShell";

type CategoryRow = { id: string; name: string; parentId: string | null; icon: string | null };
type CategoryTreeNode = CategoryRow & { children: CategoryTreeNode[] };
type SectionKey = "price" | "category" | "condition";

const CONDITION_LABELS: Record<string, string> = SPARE_PART_CONDITION_LABELS;

const CONDITIONS = Object.values(SparepartCondition);

function buildTree(categories: CategoryRow[], parentId: string | null = null): CategoryTreeNode[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .map((c) => ({ ...c, children: buildTree(categories, c.id) }));
}

// Junta el id de una categoría + todos sus descendientes (para que al tildar
// una categoría padre, el filtro incluya también lo que hay en sus subcategorías)
function getDescendantIds(categories: CategoryRow[], id: string): string[] {
  const directChildren = categories.filter((c) => c.parentId === id);
  return [id, ...directChildren.flatMap((c) => getDescendantIds(categories, c.id))];
}

function CategoryNode({
  node,
  selected,
  expandedIds,
  onToggle,
  onToggleExpand,
  depth = 0,
}: {
  node: CategoryTreeNode;
  selected: string[];
  expandedIds: string[];
  onToggle: (id: string) => void;
  onToggleExpand: (id: string) => void;
  depth?: number;
}) {
  const isSelected = selected.includes(node.id);
  const isExpanded = expandedIds.includes(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 min-h-9">
        <Checkbox id={`cat-${node.id}`} checked={isSelected} onCheckedChange={() => onToggle(node.id)} />
        <label htmlFor={`cat-${node.id}`} className="text-sm cursor-pointer flex-1 select-none py-1">
          {node.name}
        </label>
        {isSelected && hasChildren && (
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            aria-label={isExpanded ? `Ocultar subcategorías de ${node.name}` : `Ver subcategorías de ${node.name}`}
            className="text-primary mr-1 p-2 cursor-pointer"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {isSelected && isExpanded && hasChildren && (
        <div className="ml-6 mt-1 flex flex-col border-l pl-3">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              selected={selected}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onToggleExpand={onToggleExpand}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Props = { categories: CategoryRow[] };

// Igual que en /planes: el formulario se rearma desde la URL en cada cambio (VA-31 / VA-45).
export function SparePartFiltersSidebar(props: Props) {
  const searchParams = useSearchParams();
  return <SparePartFiltersForm key={searchParams.toString()} {...props} />;
}

function SparePartFiltersForm({ categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [currency, setCurrency] = useState<"ARS" | "USD">(searchParams.get("currency") === "ARS" ? "ARS" : "USD");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(searchParams.getAll("category"));
  const [condition, setCondition] = useState<string[]>(searchParams.getAll("condition"));

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(() => ({
    // El precio arranca abierto: la moneda es un filtro que siempre se aplica.
    price: true,
    category: searchParams.has("category"),
    condition: searchParams.has("condition"),
  }));
  const toggleSection = (section: SectionKey) => setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const categoryTree = useMemo(() => buildTree(categories), [categories]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>(() => searchParams.getAll("category"));

  const toggleValue = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const toggleCategory = (id: string) => {
    if (categoryIds.includes(id)) {
      // Al destildar, sacamos también todos sus descendientes de la selección
      const descendantIds = getDescendantIds(categories, id);
      setCategoryIds((prev) => prev.filter((c) => !descendantIds.includes(c)));
      setExpandedCategoryIds((prev) => prev.filter((eId) => eId !== id));
    } else {
      setCategoryIds((prev) => [...prev, id]);
      setExpandedCategoryIds((prev) => [...prev, id]); // se auto-expande al tildarla, igual que la marca
    }
  };

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    params.set("currency", currency);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    categoryIds.forEach((c) => params.append("category", c));
    condition.forEach((c) => params.append("condition", c));
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
    setIsOpenMobile(false);
  }, [searchParams, currency, minPrice, maxPrice, categoryIds, condition, router, pathname]);

  const clearFilters = () => {
    const sort = searchParams.get("sort");
    router.push(sort ? `${pathname}?sort=${sort}` : pathname);
    setIsOpenMobile(false);
  };

  const counts = {
    price: (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (currency === "ARS" ? 1 : 0),
    category: categoryIds.length,
    condition: condition.length,
  };
  const activeFilterCount = counts.price + counts.category + counts.condition;

  const appliedChips = useMemo(() => {
    const nameOf = new Map(categories.map((c) => [c.id, c.name]));
    const urlCurrency = searchParams.get("currency") === "ARS" ? "ARS" : "USD";
    const money = (v: string) => `${urlCurrency} ${Number(v).toLocaleString("es-AR")}`;
    const chips: { key: string; value: string | null; label: string }[] = [];
    if (urlCurrency === "ARS") chips.push({ key: "currency", value: null, label: "En pesos" });
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    if (min) chips.push({ key: "minPrice", value: null, label: `Desde ${money(min)}` });
    if (max) chips.push({ key: "maxPrice", value: null, label: `Hasta ${money(max)}` });
    for (const value of searchParams.getAll("category")) {
      chips.push({ key: "category", value, label: nameOf.get(value) ?? value });
    }
    for (const value of searchParams.getAll("condition")) {
      chips.push({ key: "condition", value, label: CONDITION_LABELS[value] ?? value });
    }
    return chips;
  }, [searchParams, categories]);

  const removeChip = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      // Sin la categoría, sus subcategorías tampoco.
      const ids = key === "category" ? getDescendantIds(categories, value) : [value];
      ids.forEach((id) => params.delete(key, id));
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const currencyButton = (value: "USD" | "ARS", label: string) => (
    <button
      type="button"
      onClick={() => setCurrency(value)}
      aria-pressed={currency === value}
      className={`flex-1 min-h-10 py-1.5 font-medium transition-colors cursor-pointer ${
        currency === value ? "bg-primary text-white" : "bg-white text-gray-500 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <FilterShell activeCount={activeFilterCount} onClear={clearFilters} isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile}>
      <AppliedFilterChips chips={appliedChips} onRemove={removeChip} />

      <FilterSection title="Precio" count={counts.price} open={openSections.price} onToggle={() => toggleSection("price")}>
        <div className="flex flex-col gap-2">
          <div className="flex rounded-md border overflow-hidden text-xs">
            {currencyButton("USD", "Dólares (USD)")}
            {currencyButton("ARS", "Pesos (ARS)")}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              aria-label="Precio mínimo"
              placeholder="Mín"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full px-2 py-2 border rounded-md text-sm bg-white"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              inputMode="numeric"
              aria-label="Precio máximo"
              placeholder="Máx"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full px-2 py-2 border rounded-md text-sm bg-white"
            />
          </div>
        </div>
      </FilterSection>

      {/* Categoría — árbol recursivo, sin límite de profundidad */}
      <FilterSection title="Categoría" count={counts.category} open={openSections.category} onToggle={() => toggleSection("category")}>
        <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto pr-1">
          {categoryTree.map((node) => (
            <CategoryNode
              key={node.id}
              node={node}
              selected={categoryIds}
              expandedIds={expandedCategoryIds}
              onToggle={toggleCategory}
              onToggleExpand={(id) =>
                setExpandedCategoryIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]))
              }
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Condición" count={counts.condition} open={openSections.condition} onToggle={() => toggleSection("condition")}>
        <div className="flex flex-col gap-0.5">
          {CONDITIONS.map((cond) => (
            <div key={cond} className="flex items-center gap-2 min-h-9">
              <Checkbox
                id={`cond-${cond}`}
                checked={condition.includes(cond)}
                onCheckedChange={() => toggleValue(condition, setCondition, cond)}
              />
              <label htmlFor={`cond-${cond}`} className="text-sm cursor-pointer flex-1 select-none py-1">
                {CONDITION_LABELS[cond]}
              </label>
            </div>
          ))}
        </div>
      </FilterSection>

      <button
        type="button"
        onClick={applyFilters}
        className="w-full min-h-11 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
      >
        Aplicar filtros
      </button>
    </FilterShell>
  );
}
