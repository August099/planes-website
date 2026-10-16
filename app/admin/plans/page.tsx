import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { billingText, defaultUsageText, PLAN_KIND_LABELS } from "@/lib/plan-rules";
import { PlanRowActions } from "@/components/admin/PlanRowActions";

export const dynamic = "force-dynamic";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

// VA-80: planes y suscripciones que se ofrecen en /plans. El precio por aviso suelto está en
// /admin/prices (VA-59). Los cobros, en /admin/payments (VA-92).
export default async function AdminPlansPage() {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");

  const plans = await prisma.plan.findMany({
    where: { type: { not: "AD_BANNER" } },
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { sortOrder: "asc" }, { price: "asc" }],
    include: {
      _count: { select: { purchases: true, subscriptions: true } },
    },
  });
  const activeSubs = await prisma.subscription.groupBy({
    by: ["planId"],
    // Vigentes: con el período pago o en gracia (VA-92).
    where: { OR: [{ status: "ACTIVE", currentPeriodEnd: { gt: new Date() } }, { status: "PAST_DUE", graceUntil: { gt: new Date() } }] },
    _count: { _all: true },
  });
  const subsByPlan = Object.fromEntries(activeSubs.map((s) => [s.planId, s._count._all]));

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#001F58]">Planes y suscripciones</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Lo que se ofrece en <Link href="/plans" className="underline">/plans</Link>. El aviso suelto se cobra con el precio
            de <Link href="/admin/prices" className="underline">Precios</Link>; los pagos y cobros están en{" "}
            <Link href="/admin/payments" className="underline">Pagos y facturas</Link>.
          </p>
        </div>
        <Link
          href="/admin/plans/new"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#001F58] px-4 text-xs font-bold text-white hover:bg-[#00133A]"
        >
          Nuevo plan
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#001F58]/12 bg-white">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="border-b border-[#001F58]/10 text-left">
            <tr className={LABEL}>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 text-right font-semibold">Precio</th>
              <th className="px-4 py-3 font-semibold">Incluye</th>
              <th className="px-4 py-3 font-semibold">En /plans</th>
              <th className="px-4 py-3 text-center font-semibold">Suscriptos</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  Todavía no hay planes. Creá el primero.
                </td>
              </tr>
            )}
            {plans.map((p) => {
              const archived = !!p.archivedAt;
              const users = p._count.purchases + p._count.subscriptions;
              return (
                <tr key={p.id} className={archived ? "text-slate-400" : ""}>
                  <td className="min-w-[220px] px-4 py-3">
                    <p className={`font-semibold ${archived ? "" : "text-[#001F58]"}`}>{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {[p.badge, p.isPopular && "Más elegido", p.noExpiry && "Sin vencimiento", p.includesVerifiedBadge && !/verificado/i.test(p.badge ?? "") && "Verificado", p.includesCustomPage && "Página VA"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{PLAN_KIND_LABELS[p.type]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    <span className="font-semibold">AR$ {NUMBER.format(Number(p.price))}</span>{" "}
                    <span className="text-xs text-slate-500">{billingText(p.type, p.billingInterval)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.usageDescription || defaultUsageText(p)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.isActive && !archived ? "Sí" : "No"}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-slate-600">{subsByPlan[p.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                        archived ? "bg-slate-100 text-slate-500" : p.isActive ? "bg-[#001F58] text-white" : "border border-slate-300 text-slate-600"
                      }`}
                    >
                      {archived ? "Archivado" : p.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PlanRowActions id={p.id} name={p.name} archived={archived} canDelete={users === 0} users={users} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
