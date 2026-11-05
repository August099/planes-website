"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { SERVICE_LINKS } from "@/components/ui/header-menu-shared";

// VA-191: "Servicios" abre el mismo panel que Repuestos (.va-mega en globals.css). Solo con la sección de Plan de
// vuelo prendida; apagada, el header deja el link simple. Se cierra al tocar un link, igual que SparePartsMenu.
export function ServicesMenu({ linkClass }: { linkClass: string }) {
  const [closed, setClosed] = useState(false);
  const closeOnLink = (e: React.MouseEvent) => {
    if (!(e.target instanceof Element) || !e.target.closest("a")) return;
    setClosed(true);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  return (
    <div className="va-mega group flex h-20 items-center" data-closed={closed || undefined} onClickCapture={closeOnLink} onMouseLeave={() => setClosed(false)}>
      <Link href="/services" className={`${linkClass} flex items-center gap-1`} aria-haspopup="true">
        Servicios
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden />
      </Link>

      <div
        className={`va-mega-panel ${closed ? "!invisible !opacity-0" : ""} invisible absolute inset-x-0 top-full z-50 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain -translate-y-1 border-t border-[var(--mega-line)] bg-[var(--mega-bg)] text-[var(--mega-fg)] opacity-0 shadow-[0_18px_30px_-18px_rgb(0_19_49/0.45)] transition-[opacity,transform] duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none`}
      >
        <div className="container mx-auto grid gap-10 px-4 pt-8 pb-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2.8fr)]">
          <div className="border-r border-[var(--mega-line)] pr-8">
            <p className="font-heading text-[2rem] leading-none font-black uppercase tracking-[-0.025em]">Servicios</p>
            <span aria-hidden className="mt-3 block h-0.5 w-16 bg-[#D62828]" />
            <p className="mt-4 text-sm leading-relaxed text-[var(--mega-muted)]">Herramientas para planificar un vuelo y para comprar o vender una aeronave con la información a mano.</p>
            <Link
              href="/services"
              className="mt-5 inline-flex min-h-10 items-center rounded-full border-2 border-current px-5 text-xs font-bold uppercase tracking-[0.08em] transition-colors hover:border-[#D62828] hover:bg-[#D62828] hover:text-white"
            >
              Ver todos los servicios
            </Link>
          </div>

          <ul className="grid gap-x-10 border-t border-[var(--mega-line)] md:grid-cols-2">
            {SERVICE_LINKS.map((item) => (
              <li key={item.href} className="border-b border-[var(--mega-line)]">
                <Link href={item.href} className="group/link flex items-center gap-4 py-3">
                  {/* Máscara: el trazo toma el color del panel (blanco sobre azul en la Home, azul en el resto). */}
                  <span
                    aria-hidden
                    className="h-10 w-10 shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
                    style={{ maskImage: `url(/icons/services/${item.icon}.webp)`, WebkitMaskImage: `url(/icons/services/${item.icon}.webp)` }}
                  />
                  <span className="min-w-0 transition-transform duration-200 group-hover/link:translate-x-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-[13px] text-[var(--mega-muted)]">{item.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
