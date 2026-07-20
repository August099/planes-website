import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export async function Header() {
  const session = await auth();

  const linkClass = "text-sm font-medium text-[#001F58] hover:text-primary transition-colors";

  return (
    <header className="bg-white">
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
            <div className="flex items-center gap-6">
              <Link href="/panel" className={`${linkClass} italic`}>
                {session.user.name || session.user.email}
              </Link>
              <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                <button type="submit" className={linkClass}>
                  Cerrar sesión
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className={linkClass}>
              Ingresar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}