import { signOut } from "next-auth/react";

// Piezas compartidas entre el header liviano (HeaderUser) y los menús desplegables que se cargan
// recién al usarlos (HeaderMenus). VA-76: este archivo no importa el menú de @base-ui.

export const logout = () => signOut({ redirectTo: "/" });

// VA-87: punto rojo fijo (sin animación). Solo con algo pendiente de verdad: consultas sin
// responder. "Completá tu perfil" salió del menú: esos datos se completan desde "Mi perfil".
export function PendingDot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block rounded-full bg-[#E70F1F] ${className}`} />;
}

// "sub": secciones de Servicios que se listan debajo en el menú de celular (como el panel de escritorio).
export const NAV: { href: string; label: string; sub?: { href: string; label: string }[] }[] = [
  { href: "/", label: "Inicio" },
  { href: "/planes", label: "Aviones" },
  { href: "/spareparts", label: "Repuestos" },
  {
    href: "/services",
    label: "Servicios",
    sub: [
      { href: "/services/guides", label: "Guías" },
      { href: "/services/hangars", label: "Hangares" },
      { href: "/planes/compare", label: "Comparador de aeronaves" },
    ],
  },
  { href: "/publish", label: "Vender" },
];

export const DESKTOP_TRIGGER_CLASS =
  "relative flex items-center justify-center p-2.5 rounded-lg bg-[#E70F1F] hover:bg-red-700 text-white transition-colors outline-none cursor-pointer shadow-sm border-none";
export const MOBILE_TRIGGER_CLASS = "relative p-2 rounded-lg border-none hover:bg-white/10 outline-none cursor-pointer";

export type MenuUser = { userId?: string; isAdmin: boolean; hasUnanswered: boolean; loading?: boolean };
