"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BookOpen,
  Layers,
  BarChart3,
  FileWarning,
  Globe2,
  ListFilter,
  Menu,
  Plane,
  Receipt,
  Search,
  ShieldAlert,
  Tag,
  Users,
  X,
} from "lucide-react";

export const NAV_ITEMS = [
  { label: "Resumen", href: "/admin", icon: BarChart3 },
  { label: "Publicaciones", href: "/admin/listings", icon: Plane },
  { label: "Usuarios", href: "/admin/users", icon: Users },
  { label: "Búsquedas", href: "/admin/searches", icon: Search },
  { label: "Fuentes", href: "/admin/traffic", icon: Globe2 },
  { label: "Métricas", href: "/admin/kpi", icon: ListFilter },
  { label: "Reportes", href: "/admin/report", icon: FileWarning },
  { label: "Añadir taxonomía", href: "/admin/taxonomy", icon: Tag },
  { label: "Cupones", href: "/admin/coupons", icon: Receipt },
  { label: "Precios", href: "/admin/prices", icon: Banknote },
  { label: "Planes", href: "/admin/plans", icon: Layers },
  { label: "Guías", href: "/admin/guides", icon: BookOpen },
];

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
              active ? "bg-white/15 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon className="w-4 h-4 text-red-500" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const Brand = () => (
  <div className="flex items-center gap-3">
    <ShieldAlert className="w-6 h-6 text-red-500" />
    <span className="font-bold text-lg tracking-wide">PANEL ADMIN</span>
  </div>
);

// Navegación del panel admin (VA-60): barra lateral fija desde lg; debajo, una barra superior
// con botón de menú que abre la misma navegación en un panel lateral.
export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cerrar el panel al navegar (se ajusta en el render, sin efecto: VA-63).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      {/* Celular y tablet */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[#001F58] px-4 py-3 text-white">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú del panel"
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10 cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-[#001F58] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú del panel"
                className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <NavLinks pathname={pathname} />
          </aside>
        </div>
      )}

      {/* Escritorio */}
      <aside className="hidden lg:flex w-64 bg-[#001F58] text-white flex-col border-r border-white/10 shrink-0">
        <div className="p-6 border-b border-white/10">
          <Brand />
        </div>
        <NavLinks pathname={pathname} />
        <div className="p-4 border-t border-white/10 text-xs text-white/50 text-center shrink-0">
          Ventas Aeronáuticas v1.0
        </div>
      </aside>
    </>
  );
}
