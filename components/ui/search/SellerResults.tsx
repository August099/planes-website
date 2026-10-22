"use client";

import Image from "next/image";
import Link from "next/link";
import type { SellerResult } from "@/app/actions/search-actions";

// VA-172: bloque "Vendedores" del buscador: Brokers que coinciden por nombre comercial (logo, nombre en
// negrita, cantidad de avisos y link a su Página VA). Hasta 3, con "Ver más" a /search.
export function SellerResults({ sellers, query, onSelect, max = 3 }: { sellers: SellerResult[]; query: string; onSelect?: () => void; max?: number }) {
  if (sellers.length === 0) return null;
  return (
    <div className="border-b border-slate-100 p-2">
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Vendedores</p>
      <ul>
        {sellers.slice(0, max).map((s) => (
          <li key={s.id}>
            <Link href={s.url} onClick={onSelect} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                {s.logoUrl ? (
                  <Image src={s.logoUrl} alt="" fill sizes="32px" className="object-contain" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[#001F58]">{s.name.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[#001F58]">{s.name}</span>
                <span className="block text-[11px] text-slate-500">
                  {s.listings} aviso{s.listings === 1 ? "" : "s"} · Página personalizada
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {sellers.length > max && (
        <Link href={`/search?q=${encodeURIComponent(query.trim())}#vendedores`} onClick={onSelect} className="block px-2 pt-1 text-xs font-semibold text-[#001F58] hover:underline">
          Ver más vendedores
        </Link>
      )}
    </div>
  );
}
