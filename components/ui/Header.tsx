import Link from "next/link";
import SessionProvider from "@/components/ui/SessionProvider";
import { HeaderWrapper } from "./header-wrapper";
import { HeaderLogo } from "./header-logo";
import HeaderSearchBar from "./HeaderSearchBar";
import MobileHeaderSearchBar from "./MobileHeaderSearchBar";
import { DesktopUserMenu, MobileMenu } from "./HeaderUser";
import { ServicesMenu } from "./ServicesMenu";

// Header estático (VA-71): no lee la sesión en el servidor. Antes llamaba a auth() y consultaba
// la base en cada request, y eso hacía dinámicas todas las páginas del sitio (cache-control:
// no-store). La parte del usuario (menú, puntos rojos, admin) vive en HeaderUser.tsx.
export function Header() {
  const linkClass = "text-sm font-medium hover:text-red-400 transition-colors";

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
            <Link href="/planes" className={linkClass}>
              Aviones
            </Link>
            <Link href="/spareparts" className={linkClass}>
              Repuestos
            </Link>
            {/* Servicios abre un panel con cada sección (guías, comparador) */}
            <ServicesMenu linkClass={linkClass} />
            {/* Sin sesión, el proxy manda a /login y vuelve a /publish después de ingresar. */}
            <Link href="/publish" className={linkClass}>
              Vender
            </Link>
            <DesktopUserMenu />
          </nav>

          {/* Acciones Mobile (Lupa + Menú) */}
          <div className="flex md:hidden items-center gap-1">
            <MobileHeaderSearchBar />
            <MobileMenu />
          </div>
        </div>
      </HeaderWrapper>
    </SessionProvider>
  );
}
