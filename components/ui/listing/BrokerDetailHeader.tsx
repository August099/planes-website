import Image from "next/image";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { BrokerDetail } from "@/lib/broker-detail";

// VA-170: franja de ancho completo arriba de la galería, con la portada del Broker (o la estándar de VA),
// su logo, nombre comercial, insignia de verificado y "Ver Página VA". No se imprime.
export function BrokerDetailHeader({ broker }: { broker: BrokerDetail }) {
  return (
    <section aria-label={`Vendido por ${broker.name}`} className="relative isolate overflow-hidden rounded-lg bg-[#001F58] print:hidden">
      <div className="relative aspect-[3/1] w-full sm:aspect-[6/1]">
        {broker.coverUrl ? (
          <Image src={broker.coverUrl} alt="" fill priority sizes="(min-width: 1280px) 1248px, 100vw" className="object-cover" />
        ) : (
          <svg aria-hidden viewBox="0 0 400 160" fill="none" className="absolute right-6 top-1/2 h-3/4 -translate-y-1/2 text-white/10">
            <path d="M150 4h120L126 156H6z" stroke="currentColor" strokeWidth="8" />
            <path d="M300 4h60L216 156h-60z" stroke="currentColor" strokeWidth="8" />
          </svg>
        )}
        {/* Para que el nombre se lea sobre cualquier portada. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#001F58]/85 via-[#001F58]/30 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-3 p-4 sm:p-5">
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 border-white bg-white sm:h-14 sm:w-14">
            {broker.logoUrl ? (
              <Image src={broker.logoUrl} alt={`Logo de ${broker.name}`} fill sizes="56px" className="object-contain" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-bold text-[#001F58]">{broker.name.charAt(0).toUpperCase()}</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-lg font-bold text-white sm:text-xl">
              <span className="truncate">{broker.name}</span>
              {broker.verified && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#001F58]">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verificado
                </span>
              )}
            </p>
          </div>
          <Link href={broker.pageHref} className="inline-flex min-h-10 items-center rounded-md bg-white px-4 text-sm font-bold text-[#001F58] hover:bg-slate-100">
            Ver Página VA
          </Link>
        </div>
      </div>
    </section>
  );
}
