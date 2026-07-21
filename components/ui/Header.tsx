import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { getAvailableCredits } from "@/lib/credits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export async function Header() {
  const session = await auth();
  const credits = session?.user?.id
    ? await getAvailableCredits(session.user.id)
    : null;

  const linkClass = "text-sm font-medium text-[#001F58] hover:text-primary transition-colors";

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="pt-2">
          <Image src="/logo-full.png" alt="Ventas Aeronáuticas" width={220} height={52} priority />
        </Link>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aviones..." className="pl-9 w-56" disabled />
        </div>

        <nav className="flex items-center gap-6">
          <Link href="/" className={linkClass}>
            Inicio
          </Link>
          <Link href="/aviones/publish" className={linkClass}>
            Publicar
          </Link>
          <Link href="/aviones" className={linkClass}>
            Aviones
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-3">
              {credits !== null && (
                <Link
                  href="/plans"
                  className="flex items-center gap-1.5 rounded-full border border-primary/25 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  {credits} {credits === 1 ? "crédito" : "créditos"}
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger className={`${linkClass} flex items-center gap-2 outline-none`}>
                  <User className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                  <DropdownMenuItem render={<Link href="/panel">Panel</Link>} />
                  <DropdownMenuItem render={<Link href="/planes">Comprar créditos</Link>} />
                  <DropdownMenuItem
                    render={
                      <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                        <button type="submit" className="w-full text-left">
                          Cerrar sesión
                        </button>
                      </form>
                    }
                  />
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
      </div>
    </header>
  );
}