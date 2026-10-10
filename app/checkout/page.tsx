import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getListingPrices } from "@/lib/listing-prices";
import { billingText, defaultUsageText } from "@/lib/plan-rules";
import { CONTACT_PHONE } from "@/lib/site";
import { LAUNCH_PROMO } from "@/lib/promo";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Pago",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ planId?: string }>;
}

const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

// VA-80: destino de los botones de /plans (antes daba 404). El cobro con Mercado Pago (pago único y
// débito automático) es de la Fase 6; mientras tanto se muestra el resumen y cómo seguir.
// TODO Fase 6: crear la preferencia / el preapproval de Mercado Pago acá, con el precio leído del
// servidor (nunca del cliente), y aplicar cupones.
export default async function CheckoutPage({ searchParams }: Props) {
  const { planId = "" } = await searchParams;

  let summary: { name: string; price: number; billing: string; includes: string } | null = null;
  if (planId === "listing-aircraft" || planId === "listing-parts") {
    const prices = await getListingPrices();
    const kind = planId === "listing-aircraft" ? "AIRCRAFT" : "SPARE_PART";
    summary = {
      name: kind === "AIRCRAFT" ? "Plan 1 Avión" : "Plan 1 Repuesto",
      price: prices[kind].amount,
      billing: "/ pago único",
      includes: kind === "AIRCRAFT" ? "1 aviso de avión" : "1 aviso de repuesto",
    };
  } else if (planId) {
    const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true, archivedAt: null } });
    if (plan) {
      summary = {
        name: plan.name,
        price: Number(plan.price),
        billing: billingText(plan.type, plan.billingInterval),
        includes: plan.usageDescription || defaultUsageText(plan),
      };
    }
  }

  const whatsapp = `https://wa.me/${CONTACT_PHONE.e164.replace("+", "")}?text=${encodeURIComponent(
    summary ? `Hola, quiero contratar "${summary.name}" en Ventas Aeronáuticas.` : "Hola, quiero consultar por los planes de Ventas Aeronáuticas."
  )}`;

  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] px-4 pb-20 pt-6">
      <PageBackground page="plans" />
      <div className="container mx-auto max-w-3xl">
        <Breadcrumbs items={[{ label: "Planes", href: "/plans" }, { label: "Pago" }]} className="mb-8" />

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section className="rounded-lg border border-[#001F58]/12 bg-white p-6 sm:p-8">
            <p className={LABEL}>Pago online</p>
            <h1 className="mt-1 text-2xl font-bold text-[#001F58]">Estamos terminando el pago con Mercado Pago</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Todavía no se puede pagar desde la web. Si querés contratar un plan ahora, escribinos y lo dejamos activo a
              mano.
            </p>
            {LAUNCH_PROMO.enabled && (
              <p className="mt-4 border-l-2 border-[#E70F1F] pl-3 text-sm text-slate-700">
                <strong>{LAUNCH_PROMO.title}:</strong> {LAUNCH_PROMO.text.toLowerCase()}, sin pagar nada.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-md bg-[#E70F1F] px-5 text-sm font-bold text-white hover:bg-[#C20D1A]"
              >
                Escribir por WhatsApp
              </a>
              <Link
                href="/publish"
                className="inline-flex min-h-11 items-center rounded-md border border-[#001F58]/20 px-5 text-sm font-semibold text-[#001F58] hover:bg-slate-50"
              >
                Publicar
              </Link>
            </div>
          </section>

          <aside className="self-start rounded-lg border border-[#001F58]/12 bg-white">
            <p className={`border-b border-[#001F58]/10 px-5 py-3 ${LABEL}`}>Elegiste</p>
            {summary ? (
              <dl className="divide-y divide-[#001F58]/10 text-sm">
                <div className="px-5 py-3">
                  <dt className="text-slate-500">Plan</dt>
                  <dd className="font-semibold text-[#001F58]">{summary.name}</dd>
                </div>
                <div className="px-5 py-3">
                  <dt className="text-slate-500">Incluye</dt>
                  <dd className="text-slate-800">{summary.includes}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 px-5 py-3">
                  <dt className="text-slate-500">Precio</dt>
                  <dd className="tabular-nums">
                    <span className="text-lg font-bold text-[#001F58]">
                      {summary.price === 0 ? "Gratis" : `AR$ ${NUMBER.format(summary.price)}`}
                    </span>{" "}
                    <span className="text-xs text-slate-500">{summary.billing}</span>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="px-5 py-4 text-sm text-slate-600">
                Ese plan ya no está disponible. <Link href="/plans" className="font-semibold text-[#001F58] underline">Ver planes</Link>
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
