"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PlansGridView } from "@/components/plans/PlansGridView";
import type { PlansGrid } from "@/lib/plan-grid";
import { getPlansViewerAction, type MyPlanState, type PlansViewer } from "@/app/actions/plan-state-actions";
import { PlanCardAction } from "./PlanCardAction";
import { PageHeader } from "@/components/ui/PageHeader";
import type { TestPlan } from "@/lib/test-plan";

// VA-166: la grilla de los socios (Base, Pro y Broker / Empresa). Los planes y las filas salen de la base
// (lib/plans.ts, /admin/plans). Lo del usuario (plan actual, admin, visitante) se pide en el navegador:
// la página es estática.

const SECONDARY = "flex min-h-11 w-full items-center justify-center rounded-md border border-[#00205B]/25 px-4 text-sm font-bold text-[#00205B] hover:bg-[#00205B]/5";
const NOTE = "flex min-h-11 w-full items-center justify-center rounded-md border border-[#00205B]/15 px-4 text-center text-sm font-semibold text-slate-600";

export function PlansClient({ data, testPlan }: { data: PlansGrid; testPlan: TestPlan | null }) {
  const [viewer, setViewer] = useState<PlansViewer>({ loggedIn: false, isAdmin: false, plan: null });
  useEffect(() => {
    getPlansViewerAction()
      .then(setViewer)
      .catch(() => {
        // Sin datos del usuario quedan los botones de un visitante.
      });
  }, []);
  const setPlan = (plan: MyPlanState) => setViewer((v) => ({ ...v, plan }));

  // Si ya es Broker, los interruptores arrancan en su opción.
  const current = viewer.plan?.planId;
  const brokerPick = current === data.broker.both?.id
    ? { aircraft: true, parts: true }
    : current === data.broker.aircraft?.id
      ? { aircraft: true, parts: false }
      : current === data.broker.parts?.id
        ? { aircraft: false, parts: true }
        : undefined;

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <PageBackground page="plans" />

      <div className="container mx-auto max-w-6xl px-4 pb-20 pt-6">
        <Breadcrumbs items={[{ label: "Planes" }]} className="mb-8" />
        <PageHeader variant="plain"
          routeId="va-route-plans"
          className="mb-8"
          title="Planes"
          subtitle="Todas las cuentas publican gratis. Tus avisos no vencen: cuentan los que están activos, y si pausás uno, liberás su lugar. Si necesitás más, pasate a Pro o armá tu plan Broker / Empresa. Precios en pesos, por mes, y cancelás cuando quieras."
        />

        <PlansGridView
          key={brokerPick ? `${brokerPick.aircraft}-${brokerPick.parts}` : "default"}
          grid={data}
          initialBrokerPick={brokerPick}
          renderAction={(column, plan) => {
            if (viewer.isAdmin) return <p className={NOTE}>Como admin tenés todo incluido</p>;
            if (column === "BASE") {
              if (!viewer.loggedIn) return <Link href="/register" className={SECONDARY}>Crear cuenta gratis</Link>;
              return viewer.plan ? null : <p className={NOTE}>Tu plan actual</p>;
            }
            if (!viewer.loggedIn) {
              return (
                <Link href="/register" className="flex min-h-11 w-full items-center justify-center rounded-md bg-[#00205B] px-4 text-sm font-bold text-white hover:bg-[#001331]">
                  Suscribirme
                </Link>
              );
            }
            return <PlanCardAction plan={{ id: plan.id, name: plan.name, popular: column === "PRO" }} state={viewer.plan} onStateChange={setPlan} />;
          }}
        />

        <p className="mt-6 max-w-3xl border-l-2 border-[#00205B]/30 pl-3 text-sm leading-relaxed text-slate-600">
          Si cancelás o pasás a un plan con menos cupo y tenés más avisos activos, se pausan los más nuevos. Después elegís
          cuáles quedan activos desde tu perfil. Los cambios de plan son inmediatos y sin prorrateo.
        </p>

        {/* 27/10: plan de prueba, solo cuando el admin lo publica (/admin/plans). */}
        {testPlan && (
          <section aria-labelledby="plan-prueba" className="mt-8 flex flex-col gap-4 rounded-[20px] border border-dashed border-[#00205B]/30 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="plan-prueba" className="font-heading text-lg font-extrabold text-[#00205B]">{testPlan.name}</h2>
              <p className="mt-1 text-sm text-slate-600">Pago único de AR$ {new Intl.NumberFormat("es-AR").format(testPlan.price)} para probar el cobro y la factura. No incluye avisos ni beneficios.</p>
            </div>
            <Link
              href={viewer.loggedIn ? `/checkout?planId=${testPlan.id}` : "/login?callbackUrl=/plans"}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#D62828]"
            >
              Pagar prueba
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
