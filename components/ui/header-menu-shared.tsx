import { signOut } from "next-auth/react";

// Piezas compartidas entre el header liviano (HeaderUser) y los menús desplegables que se cargan
// recién al usarlos (HeaderMenus). VA-76: este archivo no importa el menú de @base-ui.

export const logout = () => signOut({ redirectTo: "/" });

// VA-87: punto rojo fijo (sin animación). Solo con algo pendiente de verdad: consultas sin
// responder. "Completá tu perfil" salió del menú: esos datos se completan desde "Mi perfil".
export function PendingDot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block rounded-full bg-[#D62828] ${className}`} />;
}

// VA-116: Servicios sin submenú. VA-120: en el menú de celular, las categorías principales de
// repuestos van debajo de "Repuestos" (llegan del Header).
export const NAV: { href: string; label: string }[] = [
  { href: "/", label: "Inicio" },
  { href: "/aircraft", label: "Aviones" },
  { href: "/spareparts", label: "Repuestos" },
  { href: "/services", label: "Servicios" },
  { href: "/publish", label: "Vender" },
];

export type PartCategoryLink = { id: string; name: string };

export const DESKTOP_TRIGGER_CLASS =
  "relative flex h-10 w-10 items-center justify-center rounded-md bg-[#00205B] hover:bg-[#D62828] text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#D62828] focus-visible:ring-offset-2 cursor-pointer ring-1 ring-white/25 border-none";
export const MOBILE_TRIGGER_CLASS = "relative p-2 rounded-lg border-none hover:bg-white/10 outline-none cursor-pointer";

// VA-167: hasRepublish = hay republicaciones disponibles (punto en "Mi Cuenta"). VA-185: hasMissingProfile =
// faltan datos del perfil (punto en "Ajustes").
export type MenuUser = { userId?: string; isAdmin: boolean; hasUnanswered: boolean; hasRepublish?: boolean; hasMissingProfile?: boolean; loading?: boolean; partCategories?: PartCategoryLink[] };
