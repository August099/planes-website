import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { GUIDES_PATH, guidePath } from "@/lib/guides";
import { getPublishedGuides } from "@/lib/guides-data";

// Menú desplegable de "Servicios" en el header de escritorio (pedido del socio, 11/10, con
// referencia al menú de adidas): al pasar el mouse o al llegar con Tab se abre un panel a todo el
// ancho con cada sección de Servicios. Hoy: Guías y el comparador de aeronaves (VA-83). Para sumar
// una herramienta, agregarla a SERVICE_TOOLS (las guías salen de /admin/guides).
//
// Solo CSS (hover y focus-within): no suma JavaScript. Es un componente de servidor: de las guías
// pasan solo títulos y links, no su contenido.

type MenuLink = { label: string; href: string; hint?: string };
type MenuSection = { title: string; href: string; links: MenuLink[]; more?: string };

// VA-85: las guías salen de la base (publicadas, por orden); se muestran hasta 5.
const MENU_GUIDES = 5;

// Cada columna puede tener más de una sección (las de SERVICE_TOOLS van apiladas en la última).
async function serviceColumns(): Promise<MenuSection[][]> {
  const guides = (await getPublishedGuides()).slice(0, MENU_GUIDES);
  return [
    ...(guides.length
      ? [[{ title: "Guías", href: GUIDES_PATH, links: guides.map((g) => ({ label: g.title, href: guidePath(g.slug) })), more: "Ver todas las guías" }]]
      : []),
    SERVICE_TOOLS,
  ];
}

// VA-93: Hangares (VA-84) está oculto en app/_proximamente/; para volver a mostrarlo, ver
// docs/FUNCIONES_OCULTAS.md (sección arriba de "Herramientas", con HANGARS_PATH de lib/hangars).
const SERVICE_TOOLS: MenuSection[] = [
  {
    title: "Herramientas",
    href: "/planes/compare",
    links: [{ label: "Comparador de aeronaves", href: "/planes/compare", hint: "Hasta 3 aeronaves, dato por dato" }],
  },
];

export async function ServicesMenu({ linkClass }: { linkClass: string }) {
  const columns = await serviceColumns();
  return (
    <div className="group flex h-20 items-center">
      <Link href="/services" className={`${linkClass} flex items-center gap-1`} aria-haspopup="true">
        Servicios
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden />
      </Link>

      <div
        className="invisible absolute inset-x-0 top-full z-50 border-t border-[#001F58]/10 bg-white text-slate-800 opacity-0 shadow-sm transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 motion-reduce:transition-none"
      >
        <div className="container mx-auto grid gap-10 px-4 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
          {/* Presentación */}
          <div className="border-r border-[#001F58]/10 pr-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Servicios</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Herramientas y guías para comprar, vender y mantener tu aeronave.
            </p>
            <Link href="/services" className="mt-4 inline-block text-sm font-semibold text-[#001F58] hover:text-[#E70F1F] hover:underline">
              Ver todos los servicios
            </Link>
          </div>

          {columns.map((sections) => (
            <div key={sections[0].title} className="space-y-8">
              {sections.map((section) => (
                <div key={section.title}>
                  <Link href={section.href} className="text-sm font-bold text-[#001F58] hover:text-[#E70F1F]">
                    {section.title}
                  </Link>
                  <ul className="mt-3 space-y-2.5">
                    {section.links.map((l, i) => (
                      <li key={l.href}>
                        <Link href={l.href} className="group/link flex gap-3 text-sm text-slate-700 hover:text-[#001F58]">
                          {section.links.length > 1 && (
                            <span className="w-5 shrink-0 font-semibold tabular-nums text-[#E70F1F]">{String(i + 1).padStart(2, "0")}</span>
                          )}
                          <span>
                            <span className="group-hover/link:underline">{l.label}</span>
                            {l.hint && <span className="block text-xs text-slate-500">{l.hint}</span>}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {section.more && (
                    <Link href={section.href} className="mt-4 inline-block text-xs font-semibold text-[#001F58] hover:text-[#E70F1F] hover:underline">
                      {section.more}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
