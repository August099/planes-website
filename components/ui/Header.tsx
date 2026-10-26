import Link from "next/link";
import SessionProvider from "@/components/ui/SessionProvider";
import { HeaderWrapper } from "./header-wrapper";
import { HeaderLogo } from "./header-logo";
import HeaderSearchBar from "./HeaderSearchBar";
import MobileHeaderSearchBar from "./MobileHeaderSearchBar";
import { DesktopUserMenu, MobileMenu } from "./HeaderUser";
import { SparePartsMenu } from "./SparePartsMenu";
import { getSparePartCategories } from "@/lib/cached-data";

// Header estático (VA-71): no lee la sesión en el servidor. Antes llamaba a auth() y consultaba
// la base en cada request, y eso hacía dinámicas todas las páginas del sitio (cache-control:
// no-store). La parte del usuario (menú, puntos rojos, admin) vive en HeaderUser.tsx.
export async function Header() {
  const linkClass = "text-sm font-medium hover:text-red-400 transition-colors";
  // VA-120: categorías principales de repuestos para el menú (taxonomía cacheada, VA-13).
  // 26/10: cada categoría lleva sus subcategorías directas, para desplegarlas en el menú de escritorio.
  const allPartCategories = await getSparePartCategories();
  const partCategories = allPartCategories
    .filter((c) => c.parentId === null)
    .map(({ id, name }) => ({
      id,
      name,
      children: allPartCategories.filter((s) => s.parentId === id).map((s) => ({ id: s.id, name: s.name })),
    }));

  return (
    <SessionProvider>
      <HeaderWrapper>
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-2">
          <HeaderLogo />

          {/* Buscador Desktop */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <HeaderSearchBar />
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className={linkClass}>
              Inicio
            </Link>
            <Link href="/aircraft" className={linkClass}>
              Aviones
            </Link>
            {/* VA-120: Repuestos abre un panel con las categorías; VA-116: Servicios es un link simple */}
            <SparePartsMenu linkClass={linkClass} categories={partCategories} />
            <Link href="/services" className={linkClass}>
              Servicios
            </Link>
            {/* Sin sesión, el proxy manda a /login y vuelve a /publish después de ingresar. */}
            <Link href="/publish" className={linkClass}>
              Vender
            </Link>
            <DesktopUserMenu />
          </nav>

          {/* Acciones Mobile (Lupa + Menú) */}
          <div className="flex md:hidden items-center gap-1">
            <MobileHeaderSearchBar />
            <MobileMenu partCategories={partCategories} />
          </div>
        </div>
      </HeaderWrapper>
    </SessionProvider>
  );
}
