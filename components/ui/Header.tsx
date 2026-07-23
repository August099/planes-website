import Link from "next/link";
import Image from "next/image";
import { User, Search, Menu, ShieldAlert } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { getAvailableCredits } from "@/lib/credits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export async function Header() {
  const session = await auth();
  const credits = session?.user?.id
    ? await getAvailableCredits(session.user.id)
    : null;

  const linkClass =
    "text-sm font-medium text-[#001F58] hover:text-primary transition-colors";

  const sellLink = session?.user ? "/planes/publish" : "/login";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <div className="hidden md:block">
            <Image
              src="/logo-full.png"
              alt="Ventas Aeronáuticas"
              width={220}
              height={52}
              priority
            />
          </div>
          <div className="block md:hidden">
            <Image
              src="/logo-mark.png"
              alt="Ventas Aeronáuticas"
              width={48}
              height={48}
              priority
            />
          </div>
        </Link>

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aviones..." className="pl-9 w-56" disabled />
        </div>

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
          <Link href={sellLink} className={linkClass}>
            Vender
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-3">

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`${linkClass} flex items-center gap-2 outline-none cursor-pointer`}
                >
                  <User className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white min-w-[180px]">
                  <DropdownMenuItem className="p-0">
                    <Link href={`/profile/${session.user.id}`} className="w-full px-2 py-1.5 text-sm">
                      Mi Cuenta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0">
                    <Link href="/plans" className="w-full px-2 py-1.5 text-sm">
                      Comprar créditos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="p-0">
                    <form
                      action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/" });
                      }}
                      className="w-full"
                    >
                      <button
                        type="submit"
                        className="w-full text-left px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        Cerrar sesión
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link href="/login" className={`${linkClass} flex items-center gap-2`}>
              <User className="h-5 w-5" />
              Ingresar
            </Link>
          )}
        </nav>

        <div className="block md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg border border-slate-200 text-[#001F58] hover:bg-slate-50 outline-none cursor-pointer">
              <Menu className="h-6 w-6" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-white p-2 space-y-1">
              {/* Buscador interno para dispositivos móviles */}
              <div className="relative my-1 px-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar aviones..." className="pl-9 w-full text-xs" disabled />
              </div>

              <DropdownMenuSeparator />

              {/* Enlaces Principales de Navegación */}
              <DropdownMenuItem className="p-0">
                <Link href="/" className="w-full px-2 py-1.5 text-sm font-medium">
                  Inicio
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-0">
                <Link href="/planes" className="w-full px-2 py-1.5 text-sm font-medium">
                  Aviones
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-0">
                <Link href="/spareparts" className="w-full px-2 py-1.5 text-sm font-medium">
                  Repuestos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-0">
                <Link href={sellLink} className="w-full px-2 py-1.5 text-sm font-medium">
                  Vender
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {session?.user ? (
                <>
                  {credits !== null && (
                    <div className="px-2 py-1.5">
                      <Link
                        href="/plans"
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                      >
                        {credits} {credits === 1 ? "crédito" : "créditos"}
                      </Link>
                    </div>
                  )}
                  <DropdownMenuItem className="p-0">
                    <Link href={`/profile/${session.user.id}`} className="w-full px-2 py-1.5 text-sm font-medium">
                      Mi Cuenta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0">
                    <Link href="/plans" className="w-full px-2 py-1.5 text-sm font-medium">
                      Comprar créditos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="p-0">
                    <form
                      action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/" });
                      }}
                      className="w-full"
                    >
                      <button
                        type="submit"
                        className="w-full text-left px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        Cerrar sesión
                      </button>
                    </form>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem className="p-0">
                  <Link
                    href="/login"
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-semibold text-primary"
                  >
                    <User className="h-4 w-4" />
                    Ingresar a mi cuenta
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}