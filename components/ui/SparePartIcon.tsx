import { DynamicCategoryIcon } from "@/components/ui/DynamicCategoryIcon";
import { SPARE_PART_SPRITE, sparePartSpriteId } from "@/lib/spare-part-icons";

// Ícono de una categoría principal de repuestos: el del sprite (toma el color del texto, currentColor);
// si la categoría no tiene uno propio, el ícono cargado en el admin.
export function SparePartIcon({ name, icon, className }: { name: string; icon?: string | null; className?: string }) {
  const id = sparePartSpriteId(name);
  if (!id) return <DynamicCategoryIcon name={icon} className={className} />;
  return (
    <svg aria-hidden className={className}>
      <use href={`${SPARE_PART_SPRITE}#${id}`} />
    </svg>
  );
}
