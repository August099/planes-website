import { aeroStatus } from "@/lib/aero/import";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { flightPlanQuota } from "@/lib/flight-plan-quota";
import { PlannerLoader } from "@/components/flight-plan/planner/PlannerLoader";

// VA-191: plan de vuelo guiado. Sin cuenta funciona entero salvo guardar.
export const dynamic = "force-dynamic";

const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "sin fecha");
const LABEL = { MADHEL: "MADHEL", LAD: "LAD" } as const;

export default async function FlightPlanPage() {
  const [status, user] = await Promise.all([aeroStatus(), getCurrentUser()]);
  const [plans, profiles, quota] = user?.id
    ? await Promise.all([
        prisma.flightPlan.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, origin: true, destination: true, departureAt: true, data: true } }),
        prisma.aircraftProfile.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true, data: true } }),
        flightPlanQuota(user.id),
      ])
    : [[], [], { limit: null, used: 0 }];
  const dataNote = `Datos oficiales cargados: ${status.map((s) => `${LABEL[s.dataset]} ${s.lastApplied ? `vigencia ${date(s.lastApplied.sourceDate)}` : "sin cargar"}`).join(" · ")}.`;

  return (
    <PlannerLoader
      signedIn={!!user?.id}
      userName={user?.name ?? null}
      plans={plans.map((p) => ({ ...p, departureAt: p.departureAt?.toISOString() ?? null }))}
      profiles={profiles}
      limit={quota.limit}
      used={quota.used}
      dataNote={dataNote}
    />
  );
}
