"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Plane, Wrench, Zap, ArrowRight, ShieldCheck, Repeat } from "lucide-react";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { PlanCard, SinglePrices } from "@/lib/plans";

// VA-80: las tarjetas vienen armadas del servidor (lib/plans.ts): los planes activos que se editan
// en /admin/plans. VA-92: el precio de una publicación suelta va como referencia, no como plan.
export function PlansClient({ aircraftPlans, partsPlans, single }: { aircraftPlans: PlanCard[]; partsPlans: PlanCard[]; single: SinglePrices }) {
  const [activeTab, setActiveTab] = useState<"aircraft" | "parts">("aircraft");

  const currentPlans = activeTab === "aircraft" ? aircraftPlans : partsPlans;

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
            Elegí entre <strong>Packs individuales</strong> por pago único o <strong>Suscripciones mensuales ilimitadas</strong> según la necesidad de tu negocio. Precios expresados en Pesos Argentinos (ARS).
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="bg-white/80 p-1.5 rounded-2xl border border-[#001F58]/20 flex gap-2 shadow-sm backdrop-blur-sm">
            <button
              onClick={() => setActiveTab("aircraft")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === "aircraft"
                  ? "bg-[#001F58] text-white shadow-md"
                  : "text-[#001F58]/70 hover:text-[#001F58] hover:bg-[#001F58]/5"
              }`}
            >
              <Plane className="w-4 h-4" />
              <span>Aviones</span>
            </button>
            <button
              onClick={() => setActiveTab("parts")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === "parts"
                  ? "bg-[#001F58] text-white shadow-md"
                  : "text-[#001F58]/70 hover:text-[#001F58] hover:bg-[#001F58]/5"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Repuestos</span>
            </button>
          </div>
        </div>

        {/* VA-92: sin planes de 1 publicación. La suelta se paga al terminar el formulario. */}
        <p className="mx-auto -mt-6 mb-10 max-w-2xl border-l-2 border-[#001F58]/30 bg-white/80 px-4 py-3 text-sm text-slate-700 backdrop-blur-sm">
          ¿Querés publicar {activeTab === "aircraft" ? "un solo avión" : "un solo repuesto"}? No hace falta un plan: lo pagás al
          terminar de cargar el aviso, a{" "}
          <span className="font-semibold tabular-nums text-[#001F58]">{activeTab === "aircraft" ? single.aircraft : single.parts}</span> por
          publicación.{" "}
          <Link href="/publish" className="font-semibold text-[#001F58] underline underline-offset-2 hover:text-[#E70F1F]">
            Publicar
          </Link>
        </p>

        <div
          className={`grid grid-cols-1 md:grid-cols-3 ${
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

              <Link
                href={`/checkout?planId=${plan.id}`}
                className={`w-full py-3 px-4 rounded-xl font-medium text-sm text-center transition-all duration-200 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md"
                    : "bg-[#001F58] hover:bg-[#001F58]/90 text-white shadow-sm"
                }`}
              >
                <span>{plan.buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
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
              Los <strong>Packs de Pago Único</strong> te entregan créditos sin vencimiento inmediato. Las <strong>Suscripciones Ilimitadas</strong> te permiten publicar todo tu inventario activo con cancelación en cualquier momento.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}