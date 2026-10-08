import { createElement } from "react";
import { Package } from "lucide-react";
import { getCategoryIcon } from "@/components/icons/category";

interface DynamicCategoryIconProps {
  name?: string | null;
  className?: string;
}

export function DynamicCategoryIcon({ name, className }: DynamicCategoryIconProps) {
  const icon = getCategoryIcon(name);

  if (!icon) {
    return <Package className={className} />;
  }

  // createElement en vez de JSX: el componente sale de un mapa estático, no se crea en el render.
  return createElement(icon, { className });
}
