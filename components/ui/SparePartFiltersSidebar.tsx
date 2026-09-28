// components/ui/SparePartFiltersSidebar.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { SparepartCondition } from "@prisma/client";

type CategoryRow = { id: string; name: string; parentId: string | null; icon: string | null };
type CategoryTreeNode = CategoryRow & { children: CategoryTreeNode[] };

const CONDITION_LABELS: Record<SparepartCondition, string> = {
  NUEVO: "Nuevo",
  USADO: "Usado",
  RECORRIDO: "Recorrido",
  REPARAR: "A reparar",
};

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
      <div className="flex items-center gap-1" style={{ paddingLeft: depth * 14 }}>
        <Checkbox
          id={`cat-${node.id}`}
          checked={isSelected}
          onCheckedChange={() => onToggle(node.id)}
        />
        <label htmlFor={`cat-${node.id}`} className="text-sm cursor-pointer flex-1">
          {node.name}
        </label>
        {isSelected && hasChildren && (
          <button
            onClick={() => onToggleExpand(node.id)}
            className="text-primary mr-3"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {isSelected && isExpanded && hasChildren && (
        <div className="ml-6 mt-1 flex flex-col gap-1 border-l pl-3">
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

export function SparePartFiltersSidebar({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currency, setCurrency] = useState<"ARS" | "USD">(
    (searchParams.get("currency") as "ARS" | "USD") ?? "USD"
  );
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(searchParams.getAll("category"));
  const [condition, setCondition] = useState<string[]>(searchParams.getAll("condition"));

  const categoryTree = useMemo(() => buildTree(categories), [categories]);

  const toggleValue = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    const isRemoving = categoryIds.includes(id);

    if (isRemoving) {
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

    params.set("currency", currency);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    categoryIds.forEach((c) => params.append("category", c));
    condition.forEach((c) => params.append("condition", c));
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }, [currency, minPrice, maxPrice, categoryIds, condition, router, pathname]);

  const clearFilters = () => {
    setCurrency("USD");
    setMinPrice("");
    setMaxPrice("");
    setCategoryIds([]);
    setExpandedCategoryIds([]);
    setCondition([]);
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(
    minPrice || maxPrice || categoryIds.length || condition.length
  );

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

      {/* Precio + moneda */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Precio</h3>

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

      {/* Categoría — árbol recursivo, sin límite de profundidad */}
      <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
        {categoryTree.map((node) => (
          <CategoryNode
            key={node.id}
            node={node}
            selected={categoryIds}
            expandedIds={expandedCategoryIds}
            onToggle={toggleCategory}
            onToggleExpand={(id) => setExpandedCategoryIds((prev) => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])}
          />
        ))}
      </div>

      <Separator />

      {/* Condición */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Condición</h3>
        <div className="flex flex-col gap-1.5">
          {CONDITIONS.map((cond) => (
            <div key={cond} className="flex items-center gap-1">
              <Checkbox
                id={`cond-${cond}`}
                checked={condition.includes(cond)}
                onCheckedChange={() => toggleValue(condition, setCondition, cond)}
              />
              <label htmlFor={`cond-${cond}`} className="text-sm cursor-pointer flex-1">
                {CONDITION_LABELS[cond]}
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