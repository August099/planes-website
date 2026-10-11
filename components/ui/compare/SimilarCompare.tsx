import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import { formatPrice } from "@/lib/format";

type Similar = { id: string; title: string; year: number; price: unknown; totalTimeHours: number | null; images: { url: string }[] };

// VA-83: atajo del detalle. Muestra 2 aeronaves parecidas (misma categoría y precio cercano) y un
// botón que arma la comparación con la que se está viendo.
export function SimilarCompare({ currentId, items, className = "" }: { currentId: string; items: Similar[]; className?: string }) {
  if (items.length === 0) return null;
  const href = `/planes/compare?ids=${[currentId, ...items.map((i) => i.id)].join(",")}`;
  return (
    <section className={`rounded-lg border border-[#001F58]/12 bg-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#001F58]/10 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Comparar con similares</p>
          <p className="text-xs text-slate-500">Misma categoría y precio parecido</p>
        </div>
        <Link href={href} className="inline-flex min-h-10 items-center rounded-md bg-[#001F58] px-4 text-xs font-bold text-white hover:bg-[#00133A]">
          Comparar {items.length + 1}
        </Link>
      </div>
      <ul className="grid divide-y divide-[#001F58]/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {items.map((s) => (
          <li key={s.id}>
            <Link href={`/planes/plane-details/${s.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-50 sm:p-4">
              <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
                <AppImage src={s.images[0]?.url} alt={s.title} fill sizes="80px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#001F58]">{s.title}</span>
                <span className="block text-xs tabular-nums text-slate-500">
                  {s.year}
                  {s.totalTimeHours != null && ` · ${s.totalTimeHours.toLocaleString("es-AR")} hs`}
                </span>
                <span className="block text-sm font-bold tabular-nums text-[#001F58]">{formatPrice(s.price, { fallback: "Precio a consultar" })}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
