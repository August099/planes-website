import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { loadPlansGrid } from "@/lib/plans";
import { PlanGridEditor } from "@/components/admin/PlanGridEditor";

export const dynamic = "force-dynamic";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

// VA-166: planes y precios con la misma grilla de /plans, editable en su lugar (Base, Pro y Broker /
// Empresa). Los planes del modelo anterior quedan archivados (tienen compras o suscripciones).
export default async function AdminPlansPage() {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");

  const now = new Date();
  const [grid, legacy, activeSubs] = await Promise.all([
    loadPlansGrid(),
    prisma.plan.findMany({
      where: { tier: null },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { purchases: true, subscriptions: true } } },
    }),
    prisma.subscription.groupBy({
      by: ["planId"],
      // Vigentes y pagas (las cortesías no se cobran): con el período pago o en gracia (VA-92).
      where: { source: { not: "MANUAL" }, OR: [{ status: "ACTIVE", currentPeriodEnd: { gt: now } }, { status: "PAST_DUE", graceUntil: { gt: now } }] },
      _count: { _all: true },
    }),
  ]);
  const subscribers = Object.fromEntries(activeSubs.map((s) => [s.planId, s._count._all]));
  const { all, ...plansGrid } = grid;
  const option = (a: boolean, r: boolean) => all.find((p) => p.tier === "BUSINESS" && p.isUnlimitedAircraft === a && p.isUnlimitedSpareParts === r)?.id ?? null;
  const ids = {
    base: grid.base.id,
    pro: all.find((p) => p.tier === "PRO")?.id ?? null,
    brokerAircraft: option(true, false),
    brokerParts: option(false, true),
    brokerBoth: option(true, true),
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Planes y precios</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          La grilla de <Link href="/plans" className="underline">/plans</Link>, editable acá mismo. El precio real es el que se cobra
          (con la etiqueta &quot;Promo de lanzamiento&quot;); el tachado es solo para mostrar. Si bajás un cupo, nadie pierde avisos:
          quien quede por encima no publica ni activa otro hasta estar dentro. Los cobros están en{" "}
          <Link href="/admin/payments" className="underline">Pagos y facturas</Link>.
        </p>
      </div>

      <PlanGridEditor initial={plansGrid} ids={ids} subscribers={subscribers} />

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
