import Link from "next/link";
import Image from "next/image";
import { User, Search, Menu, ShieldCheck } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { HeaderWrapper } from "./header-wrapper";

export async function Header() {
  const session = await auth();

  const linkClass =
    "text-sm font-medium hover:text-red-400 transition-colors";

  const sellLink = session?.user ? "/planes/publish" : "/login";
  
  const isAdmin = Boolean((session?.user as any)?.isAdmin);

  return (
    <HeaderWrapper>
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

        {/* Buscador Desktop: Siempre blanco y con texto oscuro */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
          <Input 
            placeholder="Buscar aviones..." 
            className="pl-9 w-56 bg-white text-slate-800 placeholder:text-slate-400 border-none shadow-sm focus-visible:ring-0" 
            disabled 
          />
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className={linkClass}>
            Inicio
          </Link>
          <Link href="/store" className={linkClass}>
            Explorar
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
                  className="flex items-center justify-center p-2.5 rounded-lg bg-[#E70F1F] hover:bg-red-700 text-white transition-colors outline-none cursor-pointer shadow-sm border-none"
                  aria-label="Menú de usuario"
                >
                  <User className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white text-slate-900 min-w-[180px]">
                  {isAdmin && (
                    <>
                      <DropdownMenuItem className="p-0">
                        <Link
                          href="/admin"
                          className="w-full px-2 py-1.5 text-sm font-bold text-[#E70F1F] hover:bg-red-50 flex items-center gap-2"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Panel Admin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem className="p-0">
                    <Link href={`/profile/${session.user.id}`} className="w-full px-2 py-1.5 text-sm">
                      Mi Cuenta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0">
                    <Link href="/plans" className="w-full px-2 py-1.5 text-sm">
                      Comprar posteos
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
            <Link
              href="/login"
              className="flex items-center gap-2 bg-[#E70F1F] hover:bg-red-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <User className="h-4 w-4" />
              Ingresar
            </Link>
          )}
        </nav>

        {/* Versión Mobile */}
        <div className="block md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg border-none hover:bg-white/10 outline-none cursor-pointer">
              <Menu className="h-6 w-6" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-white text-slate-900 p-2 space-y-1">
              <div className="relative my-1 px-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar aviones..." 
                  className="pl-9 w-full text-xs bg-white text-slate-800 placeholder:text-slate-400 border-none shadow-sm" 
                  disabled 
                />
              </div>

              <DropdownMenuSeparator />

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
                  {isAdmin && (
                    <DropdownMenuItem className="p-0">
                      <Link
                        href="/admin/dashboard"
                        className="w-full px-2 py-1.5 text-sm font-bold text-[#E70F1F] bg-red-50/50 hover:bg-red-50 flex items-center gap-2 rounded-md"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Panel Admin
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem className="p-0">
                    <Link href={`/profile/${session.user.id}`} className="w-full px-2 py-1.5 text-sm font-medium">
                      Mi Cuenta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0">
                    <Link href="/plans" className="w-full px-2 py-1.5 text-sm font-medium">
                      Comprar posteos
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
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-semibold bg-[#E70F1F] text-white rounded-lg hover:bg-red-700 transition-colors"
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
    </HeaderWrapper>
  );
}