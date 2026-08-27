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
  Tag
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
    { label: "Contactos", href: "/admin/contacts", icon: MessageSquare },
    { label: "Fuentes", href: "/admin/traffic", icon: Globe2 },
    { label: "Oportunidades", href: "/admin/opportunities", icon: TrendingUp },
    { label: "Eventos", href: "/admin/events", icon: ListFilter },
    { label: "Añadir taxonomía", href: "/admin/taxonomy", icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-[#001F58] text-white flex flex-col border-r border-white/10 shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <span className="font-bold text-lg tracking-wide">PANEL ADMIN</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
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

        <div className="p-4 border-t border-white/10 text-xs text-white/50 text-center">
          Ventas Aeronáuticas v1.0
        </div>
      </aside> 

      <main className="relative isolate overflow-hidden min-h-screen flex-1 overflow-y-auto p-8 -mb-16">
        <Image
          src="/bkg-admin.png"
          alt=""
          fill
          priority
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-background/85" />
        {children}
      </main>
    </div>
  );
}