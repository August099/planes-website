import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { PageBackground } from "@/components/ui/PageBackground";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user?.isAdmin) {
    redirect("/");
  }

  return (
    // Columna en celular (barra superior + contenido), fila desde lg (barra lateral + contenido).
    <div className="flex w-full min-h-screen flex-col lg:flex-row">
      <AdminNav />

      {/* ÁREA DE CONTENIDO */}
      <div className="relative flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="relative flex-1 p-4 sm:p-8 pb-32">
          <PageBackground page="admin" />
          {children}
        </main>
      </div>
    </div>
  );
}
