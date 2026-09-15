import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminReportsTable } from "@/components/ui/AdminReportsTable";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();

  if (!user || !user.isAdmin) {
    redirect("/");
  }

  const rawReports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      aircraft: {
        select: {
          id: true,
          title: true,
        },
      },
      sparePart: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Sanitizamos campos Date para enviarlos a un Client Component
  const reports = rawReports.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#001F58] flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-600" />
            Gestión de Reportes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Revisá y moderá las denuncias e irregularidades informadas por los usuarios.
          </p>
        </div>
      </div>

      <AdminReportsTable reports={reports} />
    </div>
  );
}