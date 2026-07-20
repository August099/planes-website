import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
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
  const firstName = session?.user?.name?.split(" ")[0];

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
          <Link href="/aviones" className={linkClass}>
            Aviones
          </Link>

          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className={`${linkClass} flex items-center gap-2 outline-none`}>
                <User className="h-5 w-5" />
                <span className="italic">{firstName}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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