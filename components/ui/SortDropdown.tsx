"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Check } from "lucide-react";

const SORT_OPTIONS = [
  { value: "price_desc", label: "Mayor precio" },
  { value: "price_asc", label: "Menor precio" },
  { value: "recent", label: "Más reciente" },
  { value: "oldest", label: "Menos reciente" },
  { value: "az", label: "A - Z" },
  { value: "za", label: "Z - A" },
] as const;

export function SortDropdown() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") ?? "recent";
  const currentLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? "Ordenar por";

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm bg-white/80 hover:bg-gray-50 transition-colors">
        <ArrowUpDown className="w-4 h-4" />
        {currentLabel}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48 bg-(--background)">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            {option.label}
            {currentSort === option.value && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}