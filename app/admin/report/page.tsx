import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminReportsTable } from "@/components/ui/AdminReportsTable";
import { ModerationQueue } from "@/components/admin/ModerationQueue";
import { historyFor, pendingReviews, type ModeratedKind } from "@/lib/moderation";

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
          status: true,
        },
      },
      sparePart: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  // Sanitizamos campos Date para enviarlos a un Client Component
  const reports = rawReports.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
  // VA-154: cola de revisiones y historial de moderación de los avisos reportados.
  const [queue, history] = await Promise.all([
    pendingReviews(),
    historyFor(
      rawReports.flatMap((r): { kind: ModeratedKind; id: string }[] =>
        r.aircraft ? [{ kind: "AIRCRAFT", id: r.aircraft.id }] : r.sparePart ? [{ kind: "SPARE_PART", id: r.sparePart.id }] : []
      )
    ),
  ]);

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

      <ModerationQueue items={queue} />

      <AdminReportsTable reports={reports} history={history} />
    </div>
  );
}