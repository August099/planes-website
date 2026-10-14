"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Zap, ShieldCheck, Repeat } from "lucide-react";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { LaunchPromoNote } from "@/components/ui/LaunchPromoNote";
import type { PlanCard, SinglePrices } from "@/lib/plans";
import { getMyPlanStateAction, type MyPlanState } from "@/app/actions/plan-state-actions";
import { PlanCardAction } from "./PlanCardAction";

// VA-80: las tarjetas vienen armadas del servidor (lib/plans.ts): los planes activos que se editan
// en /admin/plans. VA-92: el precio de una publicación suelta va como referencia, no como plan.
// VA-105 (pedido del socio, 14/10): todos los planes juntos, sin pestañas de aviones y repuestos.
export function PlansClient({ plans, single }: { plans: PlanCard[]; single: SinglePrices }) {
  const currentPlans = plans;
  // VA-121: la suscripción del usuario se pide en el navegador (la página es estática).
  const [myPlan, setMyPlan] = useState<MyPlanState>(null);
  useEffect(() => {
    getMyPlanStateAction()
      .then(setMyPlan)
      .catch(() => {
        // Sin datos de la suscripción, quedan los botones de siempre.
      });
  }, []);

  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      <PageBackground page="plans" />

      <div className="container mx-auto px-4 pt-6 pb-20 max-w-6xl">
        <Breadcrumbs items={[{ label: "Planes y suscripciones" }]} className="mb-8 sm:mb-12" />
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#001F58]/10 border border-[#001F58]/20 text-[#001F58] text-xs font-semibold uppercase tracking-wider mb-4">
            <Zap className="w-4 h-4 text-red-600" />
            <span>Publicación Simple, Flexible y Sin Comisiones</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-semibold text-[#001F58] mb-4">
            PLANES Y SUSCRIPCIONES
          </h1>
          <p className="text-sm sm:text-base text-[#001F58]/80 leading-relaxed">
            Con una <strong>suscripción mensual</strong> publicás sin límite y cancelás cuando quieras. Precios expresados en Pesos Argentinos (ARS).
          </p>
        </div>

        {/* VA-111: promoción de lanzamiento (se apaga sola en el corte) */}
        <LaunchPromoNote showLink className="mx-auto mb-4 max-w-2xl bg-white/80 py-3 pr-4 backdrop-blur-sm" />

        {/* VA-92: sin planes de 1 publicación. La suelta se paga al terminar el formulario. */}
        <p className="mx-auto mb-10 max-w-2xl border-l-2 border-[#001F58]/30 bg-white/80 px-4 py-3 text-sm text-slate-700 backdrop-blur-sm">
          ¿Querés publicar una sola cosa? No hace falta un plan: la pagás al terminar de cargar el aviso, a{" "}
          <span className="font-semibold tabular-nums text-[#001F58]">{single.aircraft}</span> cada avión y{" "}
          <span className="font-semibold tabular-nums text-[#001F58]">{single.parts}</span> cada repuesto.{" "}
          <Link href="/publish" className="font-semibold text-[#001F58] underline underline-offset-2 hover:text-[#E70F1F]">
            Publicar
          </Link>
        </p>

        {/* VA-105 · 6: sin planes cargados (o archivados los de prueba), en vez de una grilla vacía. */}
        {currentPlans.length === 0 && (
          <div className="mx-auto mb-16 max-w-2xl rounded-lg border border-[#001F58]/12 bg-white px-6 py-8 text-center">
            <h2 className="text-lg font-bold text-[#001F58]">Estamos terminando de armar los planes</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Muy pronto vas a poder publicar sin límite con una suscripción. Mientras tanto, publicá de a uno al precio de arriba.
            </p>
            <Link
              href="/publish"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-[#E70F1F] px-6 text-sm font-bold text-white transition-colors hover:bg-[#C20D1A]"
            >
              Publicar
            </Link>
          </div>
        )}

        <div
          className={`${currentPlans.length === 0 ? "hidden" : ""} grid grid-cols-1 md:grid-cols-3 ${
            currentPlans.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          } gap-6 items-stretch mb-16`}
        >
          {currentPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 border ${
                plan.popular
                  ? "bg-[#001F58]/95 text-white border-red-600 shadow-2xl scale-105 backdrop-blur-sm"
                  : "bg-white/90 text-[#001F58] border-[#001F58]/20 hover:bg-white shadow-md backdrop-blur-sm"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                  Más Elegido
                </div>
              )}

              <div className="mb-6">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3
                    className={`font-heading text-lg font-semibold ${
                      plan.popular ? "text-white" : "text-[#001F58]"
                    }`}
                  >
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <span
                      className={`text-[10px] shrink-0 font-bold px-2 py-0.5 rounded border ${
                        plan.popular
                          ? "bg-white/10 text-white border-white/20"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs h-10 leading-relaxed ${
                    plan.popular ? "text-white/80" : "text-[#001F58]/70"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <div
                className={`mb-6 pb-6 border-b ${
                  plan.popular ? "border-white/15" : "border-[#001F58]/15"
                }`}
              >
                <div className="flex items-baseline gap-1">
                  <span
                    className={`font-heading text-2xl sm:text-3xl font-bold ${
                      plan.popular ? "text-white" : "text-[#001F58]"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-xs ${
                      plan.popular ? "text-white/70" : "text-[#001F58]/60"
                    }`}
                  >
                    {plan.billingText}
                  </span>
                </div>
                <div
                  className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${
                    plan.isSubscription
                      ? plan.popular
                        ? "bg-red-500/20 text-red-200 border border-red-400/30"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                      : plan.popular
                      ? "bg-white/10 text-white border border-white/20"
                      : "bg-[#001F58]/5 text-[#001F58] border border-[#001F58]/10"
                  }`}
                >
                  {plan.isSubscription && <Repeat className="w-3 h-3" />}
                  <span>{plan.postCount}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                    <Check
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plan.popular ? "text-red-400" : "text-red-600"
                      }`}
                    />
                    <span
                      className={plan.popular ? "text-white/90" : "text-[#001F58]/80"}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <PlanCardAction plan={plan} state={myPlan} onStateChange={setMyPlan} />
            </div>
          ))}
        </div>

        <div className="bg-white/80 border border-[#001F58]/20 rounded-2xl p-6 backdrop-blur-sm max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-5 shadow-sm">
          <div className="bg-[#001F58] p-3 rounded-xl text-white shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <h4 className="font-heading font-semibold text-[#001F58] text-base mb-1">
              Flexibilidad total para tus publicaciones
            </h4>
            <p className="text-xs sm:text-sm text-[#001F58]/80 leading-relaxed">
              Las <strong>suscripciones</strong> te permiten publicar todo tu inventario sin límite, con cancelación en cualquier momento: el plan sigue hasta el fin del período pagado.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}