"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { User, Menu, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getHeaderIndicators, type HeaderIndicators } from "@/app/actions/header-actions";

// Parte del header que depende del usuario (VA-71). Es un componente cliente: así el resto del
// header (y las páginas sin datos de usuario) pueden ser estáticas y cachearse en el CDN.

function useHeaderUser() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [indicators, setIndicators] = useState<HeaderIndicators | null>(null);
  const userId = session?.user?.id;

  // Se vuelven a pedir al navegar (por ejemplo, después de responder una pregunta).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getHeaderIndicators()
      .then((r) => {
        if (!cancelled) setIndicators(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, pathname]);

  const ind = userId ? indicators : null;
  return {
    status,
    userId,
    isAdmin: !!ind?.isAdmin || !!session?.user?.isAdmin,
    hasUnanswered: !!ind?.hasUnanswered,
  };
}

const logout = () => signOut({ redirectTo: "/" });

// VA-87: punto rojo fijo (sin animación). Solo con algo pendiente de verdad: consultas sin
// responder. "Completá tu perfil" salió del menú: esos datos se completan desde "Mi perfil".
function PendingDot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block rounded-full bg-[#E70F1F] ${className}`} />;
}

export function DesktopUserMenu() {
  const { status, userId, isAdmin, hasUnanswered } = useHeaderUser();

  // Mientras se resuelve la sesión: un lugar del mismo tamaño, sin saltos.
  if (status === "loading") return <div className="h-9 w-9 rounded-lg bg-slate-200/40" aria-hidden />;

  if (!userId) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 bg-[#E70F1F] hover:bg-red-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
      >
        <User className="h-4 w-4" />
        Ingresar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="relative flex items-center justify-center p-2.5 rounded-lg bg-[#E70F1F] hover:bg-red-700 text-white transition-colors outline-none cursor-pointer shadow-sm border-none"
          aria-label={hasUnanswered ? "Menú de usuario (tenés consultas sin responder)" : "Menú de usuario"}
        >
          <User className="h-4 w-4" />
          {hasUnanswered && <PendingDot className="absolute -top-1 -right-1 h-3 w-3 border-2 border-white" />}
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
            <Link href={`/profile/${userId}`} className="w-full px-2 py-1.5 text-sm flex items-center justify-between gap-3">
              <span>Mi Cuenta</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="p-0">
            <Link href="/questions" className="w-full px-2 py-1.5 text-sm flex items-center justify-between">
              <span>Mis consultas</span>
              {hasUnanswered && <PendingDot className="h-2 w-2" />}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="p-0">
            <Link href="/favs" className="w-full px-2 py-1.5 text-sm">
              Favoritos
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="p-0">
            <button
              type="button"
              onClick={logout}
              className="w-full text-left px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              Cerrar sesión
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/planes", label: "Aviones" },
  { href: "/spareparts", label: "Repuestos" },
  { href: "/services", label: "Servicios" },
  { href: "/publish", label: "Vender" },
];

export function MobileMenu() {
  const { status, userId, isAdmin, hasUnanswered } = useHeaderUser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative p-2 rounded-lg border-none hover:bg-white/10 outline-none cursor-pointer"
        aria-label={hasUnanswered ? "Abrir menú (tenés consultas sin responder)" : "Abrir menú"}
      >
        <Menu className="h-6 w-6" />
        {hasUnanswered && <PendingDot className="absolute top-1.5 right-1.5 h-2.5 w-2.5 border border-white" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white text-slate-900 p-2 space-y-1">
        {NAV.map((item) => (
          <DropdownMenuItem key={item.href} className="p-0">
            <Link href={item.href} className="w-full px-2 py-1.5 text-sm font-medium">
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {userId ? (
          <>
            {isAdmin && (
              <DropdownMenuItem className="p-0">
                <Link
                  href="/admin"
                  className="w-full px-2 py-1.5 text-sm font-bold text-[#E70F1F] bg-red-50/50 hover:bg-red-50 flex items-center gap-2 rounded-md"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Panel Admin
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="p-0">
              <Link href={`/profile/${userId}`} className="w-full px-2 py-1.5 text-sm font-medium flex items-center justify-between gap-3">
                <span>Mi Cuenta</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="p-0">
              <Link href="/questions" className="w-full px-2 py-1.5 text-sm font-medium flex items-center justify-between">
                <span>Mis consultas</span>
                {hasUnanswered && <PendingDot className="h-2 w-2" />}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="p-0">
              <Link href="/favs" className="w-full px-2 py-1.5 text-sm font-medium">
                Favoritos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0">
              <button
                type="button"
                onClick={logout}
                className="w-full text-left px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
              >
                Cerrar sesión
              </button>
            </DropdownMenuItem>
          </>
        ) : status === "loading" ? null : (
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
  );
}
