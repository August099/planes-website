"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { NAV_ITEMS } from "@/components/admin/AdminNav";

// Ruta del panel admin (VA-81): Inicio › Admin › sección. El layout del servidor no conoce la ruta,
// por eso lee el pathname acá. Sin JSON-LD: el panel no se indexa.
export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const section = pathname === "/admin" ? null : NAV_ITEMS.find((item) => item.href !== "/admin" && pathname.startsWith(item.href));
  return (
    <Breadcrumbs
      items={section ? [{ label: "Admin", href: "/admin" }, { label: section.label }] : [{ label: "Admin" }]}
      jsonLd={false}
      className="mb-4"
    />
  );
}
