import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { defaultUsageText, PLAN_TIER_LABELS } from "@/lib/plan-rules";
import { getFreeQuota } from "@/lib/quota";
import { FreeQuotaForm } from "@/components/admin/FreeQuotaForm";

export const dynamic = "force-dynamic";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

// VA-152: planes y precios en un solo lugar (antes /admin/plans y /admin/prices). Estructura fija:
// el cupo Gratis, Pro y las 3 opciones del Empresarial. Sin precio, un plan no se puede activar y no
// se ve en /plans. Los planes del modelo anterior quedan archivados (tienen compras o suscripciones).
export default async function AdminPlansPage() {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");

  const now = new Date();
  const [free, plans, legacy, activeSubs] = await Promise.all([
    getFreeQuota(),
    prisma.plan.findMany({ where: { tier: { not: null } }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    prisma.plan.findMany({
      where: { tier: null },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { purchases: true, subscriptions: true } } },
    }),
    prisma.subscription.groupBy({
      by: ["planId"],
      // Vigentes: con el período pago o en gracia (VA-92).
      where: { OR: [{ status: "ACTIVE", currentPeriodEnd: { gt: now } }, { status: "PAST_DUE", graceUntil: { gt: now } }] },
      _count: { _all: true },
    }),
  ]);
  const subsByPlan = Object.fromEntries(activeSubs.map((s) => [s.planId, s._count._all]));
  const freeCounts = { AIRCRAFT: free.AIRCRAFT ?? 0, SPARE_PART: free.SPARE_PART ?? 0 };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Planes y precios</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Lo que se ofrece en <Link href="/plans" className="underline">/plans</Link>: el cupo de avisos activos de cada plan y el
          precio mensual. Los cobros están en <Link href="/admin/payments" className="underline">Pagos y facturas</Link>.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-[#001F58]/12 bg-white p-5 sm:p-6">
        <div>
          <p className={LABEL}>01 // Gratis</p>
          <h2 className="mt-1 text-lg font-bold text-[#001F58]">Cupo de todas las cuentas</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Lo tiene toda cuenta sin suscripción, y el Empresarial en lo que no elige ilimitado. Si lo bajás, nadie pierde
            avisos: quien quede por encima no publica ni activa otro hasta estar dentro del cupo.
          </p>
        </div>
        <FreeQuotaForm aircraft={freeCounts.AIRCRAFT} parts={freeCounts.SPARE_PART} />
      </section>

      <section className="space-y-3">
        <p className={LABEL}>02 // Pro y 03 // Empresarial</p>
        <div className="overflow-x-auto rounded-lg border border-[#001F58]/12 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-[#001F58]/10 text-left">
              <tr className={LABEL}>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 text-right font-semibold">Precio / mes</th>
                <th className="px-4 py-3 font-semibold">Cupo</th>
                <th className="px-4 py-3 font-semibold">Beneficios</th>
                <th className="px-4 py-3 text-center font-semibold">Suscriptos</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Todavía no están los planes: se crean con <code>scripts/va152-migrate-data.ts</code>.
                  </td>
                </tr>
              )}
              {plans.map((p) => {
                const price = Number(p.price);
                return (
                  <tr key={p.id}>
                    <td className="min-w-[220px] px-4 py-3">
                      <p className="font-semibold text-[#001F58]">{p.name}</p>
                      <p className="text-xs text-slate-500">{PLAN_TIER_LABELS[p.tier!]}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {price > 0 ? <span className="font-semibold">AR$ {NUMBER.format(price)}</span> : <span className="text-amber-700">Sin precio</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{defaultUsageText(p, freeCounts)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {[p.includesCustomPage && "Página VA", p.includesSellerMetrics && "Métricas", p.includesVerifiedBadge && "Verificado"].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-600">{subsByPlan[p.id] ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                          p.isActive ? "bg-[#001F58] text-white" : "border border-slate-300 text-slate-600"
                        }`}
                      >
                        {p.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/plans/${p.id}`} className="text-xs font-semibold text-[#001F58] hover:underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {legacy.length > 0 && (
        <section className="space-y-3">
          <div>
            <p className={LABEL}>Modelo anterior</p>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Archivados: no se venden y quedan por las compras y suscripciones que los usaron (historial).
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#001F58]/12 bg-white">
            <table className="w-full min-w-[600px] text-sm text-slate-500">
              <thead className="border-b border-[#001F58]/10 text-left">
                <tr className={LABEL}>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 text-right font-semibold">Precio</th>
                  <th className="px-4 py-3 text-center font-semibold">Compras</th>
                  <th className="px-4 py-3 text-center font-semibold">Suscripciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {legacy.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">AR$ {NUMBER.format(Number(p.price))}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{p._count.purchases}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{p._count.subscriptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
