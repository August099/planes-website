import Link from "next/link";

// VA-108: categoría del aviso debajo del título, como link al listado filtrado.
// Acepta varios niveles ("A › B"); hoy los detalles pasan uno solo (VA-117).
export function CategoryLinks({ items }: { items: { label: string; href: string }[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Categoría del aviso" className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm">
      {items.map((item, i) => (
        <span key={item.href} className="flex items-center gap-x-1.5">
          {i > 0 && <span aria-hidden className="text-slate-400">›</span>}
          <Link href={item.href} className="font-medium text-[#001F58] hover:text-[#E70F1F] hover:underline">
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
