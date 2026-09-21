import Link from "next/link";
import { 
  BarChart3, 
  Plane, 
  Search, 
  MessageSquare, 
  Globe2, 
  TrendingUp, 
  ListFilter,
  ShieldAlert,
  Tag,
  Receipt,
  FileWarning
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || !(user as any).isAdmin) {
    redirect("/");
  }

  const navItems = [
    { label: "Resumen", href: "/admin", icon: BarChart3 },
    { label: "Publicaciones", href: "/admin/listings", icon: Plane },
    { label: "Búsquedas", href: "/admin/searches", icon: Search },
    { label: "Fuentes", href: "/admin/traffic", icon: Globe2 },
    { label: "Métricas", href: "/admin/kpi", icon: ListFilter },
    { label: "Reportes", href: "/admin/report", icon: FileWarning },
    { label: "Añadir taxonomía", href: "/admin/taxonomy", icon: Tag },
    { label: "Cupones", href: "/admin/coupons", icon: Receipt },
  ];

  return (
    <div className="flex w-full min-h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#001F58] text-white flex flex-col border-r border-white/10 shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <span className="font-bold text-lg tracking-wide">PANEL ADMIN</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Icon className="w-4 h-4 text-red-500" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 text-xs text-white/50 text-center shrink-0">
          Ventas Aeronáuticas v1.0
        </div>
      </aside> 

      {/* ÁREA DE CONTENIDO */}
      <div className="relative flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        <main className="relative flex-1 p-6 sm:p-8 pb-32">
          <Image
            src="/bkg-profile.jpg"
            alt=""
            fill
            priority
            className="-z-20 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-background/85" />
          {children}
        </main>
      </div>
    </div>
  );
}