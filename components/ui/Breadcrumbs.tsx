import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/site";

// Ruta de navegación de las páginas internas (VA-81). Siempre empieza en "Inicio" y el último ítem es
// la página actual (sin link). Publica el BreadcrumbList de JSON-LD salvo con jsonLd={false}: los
// detalles de avisos y las guías ya lo incluyen en su propio JSON-LD (lib/structured-data.ts).
// Sin hooks: se puede usar desde páginas de servidor y de cliente.
export type Crumb = { label: string; href?: string };

export function Breadcrumbs({
  items,
  jsonLd = true,
  className = "container mx-auto px-4",
}: {
  items: Crumb[];
  jsonLd?: boolean;
  // Contenedor: por defecto el estándar; las páginas cuyo <main> ya es un contenedor pasan "".
  className?: string;
}) {
  const all: Crumb[] = [{ label: "Inicio", href: "/" }, ...items];
  const last = all.length - 1;

  return (
    <>
      {jsonLd && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: all.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.label,
              ...(c.href && i !== last ? { item: absoluteUrl(c.href) } : {}),
            })),
          }}
        />
      )}
      <nav aria-label="Ruta de navegación" className={`text-xs text-slate-600 print:hidden ${className}`}>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 py-2">
          {all.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="text-slate-400">
                  ›
                </span>
              )}
              {i === last || !c.href ? (
                <span aria-current={i === last ? "page" : undefined} className="truncate font-medium text-[#001F58] max-w-[16rem] sm:max-w-md">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-[#001F58] hover:underline">
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
