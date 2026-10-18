"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { PaidPlan, PlansPage } from "@/lib/plans";
import { getMyPlanStateAction, type MyPlanState } from "@/app/actions/plan-state-actions";
import { PlanCardAction } from "./PlanCardAction";

// VA-152: Gratis, Pro y Empresarial en una sola placa de tres columnas (apiladas en celular). El
// Empresarial se arma con dos casillas (aviones y/o repuestos ilimitados) que eligen una de sus 3
// opciones, cada una con su precio. Los planes salen de la base (lib/plans.ts, /admin/plans).

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const ars = (n: number) => `AR$ ${NUMBER.format(n)}`;
const qty = (n: number | null) => (n === null ? "Ilimitados" : NUMBER.format(n));

function Eyebrow({ n, name }: { n: string; name: string }) {
  return (
    <p className={LABEL}>
      {n} <span className="text-[#E70F1F]">{"//"}</span> {name}
    </p>
  );
}

function Quota({ aircraft, parts }: { aircraft: number | null; parts: number | null }) {
  return (
    <dl className="divide-y divide-[#001F58]/10 border-y border-[#001F58]/10 text-sm">
      <div className="flex items-center justify-between py-2">
        <dt className="text-slate-500">Aviones activos</dt>
        <dd className="font-semibold tabular-nums text-[#001F58]">{qty(aircraft)}</dd>
      </div>
      <div className="flex items-center justify-between py-2">
        <dt className="text-slate-500">Repuestos activos</dt>
        <dd className="font-semibold tabular-nums text-[#001F58]">{qty(parts)}</dd>
      </div>
    </dl>
  );
}

function Features({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2 text-sm text-slate-700">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E70F1F]" aria-hidden />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

function Price({ plan }: { plan: PaidPlan }) {
  return (
    <p className="flex items-baseline gap-1">
      <span className="font-heading text-3xl font-bold tabular-nums text-[#001F58]">{ars(plan.price)}</span>
      <span className="text-sm text-slate-500">/ mes</span>
    </p>
  );
}

const COLUMN = "flex flex-col gap-5 p-6 sm:p-8";

export function PlansClient({ data }: { data: PlansPage }) {
  // VA-121: la suscripción del usuario se pide en el navegador (la página es estática).
  const [myPlan, setMyPlan] = useState<MyPlanState>(null);
  useEffect(() => {
    getMyPlanStateAction()
      .then(setMyPlan)
      .catch(() => {
        // Sin datos de la suscripción, quedan los botones de siempre.
      });
  }, []);

  const { free, pro, business } = data;
  const options = [business.aircraft, business.parts, business.both].filter((p): p is PaidPlan => !!p);
  // Casillas del Empresarial: arranca en la opción del plan actual si es Empresarial; si no, la más completa.
  const current = options.find((o) => o.id === myPlan?.planId);
  const [pick, setPick] = useState<{ aircraft: boolean; parts: boolean } | null>(null);
  const initial = business.both ? { aircraft: true, parts: true } : business.aircraft ? { aircraft: true, parts: false } : { aircraft: false, parts: true };
  const sel =
    pick ??
    (current
      ? { aircraft: current.aircraft === null, parts: current.parts === null }
      : initial);
  const chosen = sel.aircraft && sel.parts ? business.both : sel.aircraft ? business.aircraft : sel.parts ? business.parts : null;
  const hasPaid = !!pro || options.length > 0;

  const toggle = (key: "aircraft" | "parts") => setPick({ ...sel, [key]: !sel[key] });
  const available = (a: boolean, r: boolean) => !!(a && r ? business.both : a ? business.aircraft : r ? business.parts : null);

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <PageBackground page="plans" />

      <div className="container mx-auto max-w-6xl px-4 pb-20 pt-6">
        <Breadcrumbs items={[{ label: "Planes" }]} className="mb-8" />
        <header className="mb-8 max-w-3xl space-y-3">
          <h1 className="font-heading text-3xl font-bold text-[#001F58] sm:text-5xl">Planes</h1>
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            Todas las cuentas publican gratis. Tus avisos no vencen: cuentan los que están activos, y si pausás uno, liberás
            su lugar. Si necesitás más, pasate a Pro o armá tu plan Empresarial. Precios en pesos, por mes, y cancelás cuando quieras.
          </p>
        </header>

        <section
          aria-label="Planes"
          className={`grid grid-cols-1 divide-y divide-[#001F58]/10 rounded-lg border border-[#001F58]/12 bg-white md:divide-x md:divide-y-0 ${
            hasPaid ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {/* 01 · Gratis */}
          <div className={COLUMN}>
            <div className="space-y-2">
              <Eyebrow n="01" name="Gratis" />
              <p className="font-heading text-3xl font-bold text-[#001F58]">Gratis</p>
              <p className="text-sm text-slate-600">Para siempre, en todas las cuentas.</p>
            </div>
            <Quota aircraft={free.aircraft} parts={free.parts} />
            <Features items={["Sin vencimiento", "Pausás y activás tus avisos cuando quieras"]} />
            <div className="mt-auto">
              <Link
                href="/publish"
                className="flex min-h-11 w-full items-center justify-center rounded-md border border-[#001F58]/25 px-4 text-sm font-bold text-[#001F58] hover:bg-[#001F58]/5"
              >
                Publicar gratis
              </Link>
            </div>
          </div>

          {!hasPaid && (
            <div className={COLUMN}>
              <div className="space-y-2">
                <Eyebrow n="02" name="Pro y Empresarial" />
                <p className="font-heading text-2xl font-bold text-[#001F58]">Muy pronto</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Más avisos activos al mismo tiempo, Página VA y métricas de tus avisos. Mientras tanto, publicá gratis.
                </p>
              </div>
            </div>
          )}

          {/* 02 · Pro */}
          {hasPaid && (
            <div className={COLUMN}>
              <div className="space-y-2">
                <Eyebrow n="02" name="Pro" />
                {pro ? (
                  <>
                    <Price plan={pro} />
                    {pro.description && <p className="text-sm text-slate-600">{pro.description}</p>}
                  </>
                ) : (
                  <p className="font-heading text-2xl font-bold text-[#001F58]">Muy pronto</p>
                )}
              </div>
              {pro && (
                <>
                  <Quota aircraft={pro.aircraft} parts={pro.parts} />
                  <Features items={pro.features} />
                  <div className="mt-auto">
                    <PlanCardAction plan={{ id: pro.id, name: pro.name, popular: pro.popular }} state={myPlan} onStateChange={setMyPlan} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* 03 · Empresarial (configurable) */}
          {hasPaid && (
            <div className={`${COLUMN} md:bg-[#001F58]/[0.02]`}>
              <div className="space-y-2">
                <Eyebrow n="03" name="Empresarial" />
                {chosen ? <Price plan={chosen} /> : <p className="font-heading text-2xl font-bold text-[#001F58]">{options.length ? "Elegí qué querés ilimitado" : "Muy pronto"}</p>}
                <p className="text-sm text-slate-600">Para concesionarios, talleres y empresas. Elegí qué publicás sin límite.</p>
              </div>
              {options.length > 0 && (
                <>
                  <fieldset className="space-y-2">
                    <legend className={`${LABEL} mb-2`}>Ilimitado</legend>
                    {(
                      [
                        ["aircraft", "Aviones ilimitados"],
                        ["parts", "Repuestos ilimitados"],
                      ] as const
                    ).map(([key, label]) => {
                      const next = { ...sel, [key]: !sel[key] };
                      const disabled = sel[key] ? false : !available(next.aircraft, next.parts);
                      return (
                        <label key={key} className={`flex min-h-11 items-center gap-3 rounded-md border border-[#001F58]/15 px-3 text-sm ${disabled ? "opacity-50" : "cursor-pointer hover:border-[#001F58]/40"}`}>
                          <input type="checkbox" checked={sel[key]} disabled={disabled} onChange={() => toggle(key)} className="h-4 w-4 accent-[#001F58]" />
                          <span className="font-medium text-[#001F58]">{label}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                  {chosen ? (
                    <>
                      <Quota aircraft={chosen.aircraft} parts={chosen.parts} />
                      <Features items={chosen.features} />
                      <div className="mt-auto">
                        <PlanCardAction plan={{ id: chosen.id, name: chosen.name, popular: chosen.popular }} state={myPlan} onStateChange={setMyPlan} />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">Marcá al menos una opción.</p>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <p className="mt-6 max-w-3xl border-l-2 border-[#001F58]/30 pl-3 text-sm leading-relaxed text-slate-600">
          Si cancelás o pasás a un plan con menos cupo y tenés más avisos activos, se pausan los más nuevos. Después elegís
          cuáles quedan activos desde tu perfil. Los cambios de plan son inmediatos y sin prorrateo.
        </p>
      </div>
    </main>
  );
}
