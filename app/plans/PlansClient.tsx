"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PlansGridView } from "@/components/plans/PlansGridView";
import type { PlansGrid } from "@/lib/plan-grid";
import { getPlansViewerAction, type MyPlanState, type PlansViewer } from "@/app/actions/plan-state-actions";
import { PlanCardAction } from "./PlanCardAction";

// VA-166: la grilla de los socios (Base, Pro y Broker / Empresa). Los planes y las filas salen de la base
// (lib/plans.ts, /admin/plans). Lo del usuario (plan actual, admin, visitante) se pide en el navegador:
// la página es estática.

const SECONDARY = "flex min-h-11 w-full items-center justify-center rounded-md border border-[#001F58]/25 px-4 text-sm font-bold text-[#001F58] hover:bg-[#001F58]/5";
const NOTE = "flex min-h-11 w-full items-center justify-center rounded-md border border-[#001F58]/15 px-4 text-center text-sm font-semibold text-slate-600";

export function PlansClient({ data }: { data: PlansGrid }) {
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
        <header className="mb-8 max-w-3xl space-y-3">
          <h1 className="font-heading text-3xl font-bold text-[#001F58] sm:text-5xl">Planes</h1>
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            Todas las cuentas publican gratis. Tus avisos no vencen: cuentan los que están activos, y si pausás uno, liberás su
            lugar. Si necesitás más, pasate a Pro o armá tu plan Broker / Empresa. Precios en pesos, por mes, y cancelás cuando quieras.
          </p>
        </header>

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
                <Link href="/register" className="flex min-h-11 w-full items-center justify-center rounded-md bg-[#001F58] px-4 text-sm font-bold text-white hover:bg-[#00133A]">
                  Suscribirme
                </Link>
              );
            }
            return <PlanCardAction plan={{ id: plan.id, name: plan.name, popular: column === "PRO" }} state={viewer.plan} onStateChange={setPlan} />;
          }}
        />

        <p className="mt-6 max-w-3xl border-l-2 border-[#001F58]/30 pl-3 text-sm leading-relaxed text-slate-600">
          Si cancelás o pasás a un plan con menos cupo y tenés más avisos activos, se pausan los más nuevos. Después elegís
          cuáles quedan activos desde tu perfil. Los cambios de plan son inmediatos y sin prorrateo.
        </p>
      </div>
    </main>
  );
}
