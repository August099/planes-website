"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Menu, ShieldCheck, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  DESKTOP_TRIGGER_CLASS,
  logout,
  MOBILE_TRIGGER_CLASS,
  NAV,
  PendingDot,
  type MenuUser,
} from "@/components/ui/header-menu-shared";

// Menús desplegables del header (VA-76): este módulo trae el menú de @base-ui (~140 KB) y se
// descarga recién cuando el usuario se acerca al botón (HeaderUser). Se monta ya abierto, porque
// solo aparece después de un clic.

export function DesktopDropdown({ userId, isAdmin, hasUnanswered }: MenuUser & { userId: string }) {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger
        className={DESKTOP_TRIGGER_CLASS}
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
  );
}

export function MobileDropdown({ userId, isAdmin, hasUnanswered, loading, partCategories = [] }: MenuUser) {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger
        className={MOBILE_TRIGGER_CLASS}
        aria-label={hasUnanswered ? "Abrir menú (tenés consultas sin responder)" : "Abrir menú"}
      >
        <Menu className="h-6 w-6" />
        {hasUnanswered && <PendingDot className="absolute top-1.5 right-1.5 h-2.5 w-2.5 border border-white" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white text-slate-900 p-2 space-y-1">
        {NAV.map((item) =>
          item.href === "/spareparts" && partCategories.length > 0 ? (
            <SparePartsGroup key={item.href} label={item.label} categories={partCategories} />
          ) : (
            <DropdownMenuItem key={item.href} className="p-0">
              <Link href={item.href} className="w-full px-2 py-1.5 text-sm font-medium">
                {item.label}
              </Link>
            </DropdownMenuItem>
          )
        )}

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
        ) : loading ? null : (
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

// VA-133: en el menú del celular, "Repuestos" abre el listado y la flecha despliega sus categorías
// (cerradas al abrir el menú, para que la lista no tape el resto de las opciones).
function SparePartsGroup({ label, categories }: { label: string; categories: NonNullable<MenuUser["partCategories"]> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex items-center">
        <DropdownMenuItem className="flex-1 p-0">
          <Link href="/spareparts" className="w-full px-2 py-1.5 text-sm font-medium">
            {label}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Ocultar categorías de repuestos" : "Ver categorías de repuestos"}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center p-0"
        >
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </DropdownMenuItem>
      </div>
      {open &&
        categories.map((c) => (
          <DropdownMenuItem key={c.id} className="p-0">
            <Link
              href={`/spareparts?category=${encodeURIComponent(c.id)}`}
              className="w-full border-l-2 border-[#001F58]/15 py-1 pl-4 pr-2 text-sm text-slate-600"
            >
              {c.name}
            </Link>
          </DropdownMenuItem>
        ))}
    </>
  );
}
