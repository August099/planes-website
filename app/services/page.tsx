import type { Metadata } from "next";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { GuideIndex } from "@/components/ui/guides/GuideIndex";
import { GUIDES_PATH } from "@/lib/guides";
import { getPublishedGuides } from "@/lib/guides-data";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { DisplayTitle } from "@/components/ui/home/DisplayTitle";
import { FlightPaths } from "@/components/ui/home/FlightPaths";
import { BrandBars } from "@/components/ui/home/BrandBars";
import { ArrowRight, Building2, CalendarDays, Calculator, Columns3, Map as MapIcon, MessagesSquare, Users, Warehouse, Wrench, type LucideIcon } from "lucide-react";
import { CALCULATORS } from "@/lib/aero/calculators";
import { CALCULATORS_PATH, FLIGHT_PLAN_PATH, MAP_PATH, flightPlanEnabled } from "@/lib/flight-plan-flag";

export const metadata: Metadata = {
  // El layout agrega " | Ventas Aeronáuticas".
  title: "Servicios aeronáuticos",
  description: flightPlanEnabled()
    ? "Plan de vuelo con formulario OACI, mapa aeronáutico, calculadoras, guías para comprar y vender aeronaves y comparador. Muy pronto, talleres, hangares, profesionales y empresas del sector."
    : "Guías para comprar y vender aeronaves (pre-compra, transferencia ante ANAC y glosario), comparador de aeronaves y, muy pronto, talleres, hangares, profesionales y empresas del sector.",
  alternates: { canonical: "/services" },
};

const upcomingServices = [
  {
    title: "Pilotos y profesionales",
    initials: "PP",
    icon: Users,
    description: "Encontrá pilotos, mecánicos, instructores y especialistas del sector.",
  },
  {
    title: "Talleres y mantenimiento",
    initials: "TM",
    icon: Wrench,
    description: "Conectate con talleres, servicios de mantenimiento y reparación aeronáutica.",
  },
  {
    title: "Hangares y espacios",
    initials: "HE",
    icon: Warehouse,
    description: "Encontrá hangares, espacios disponibles y servicios relacionados.",
  },
  {
    title: "Eventos y actividades",
    initials: "EA",
    icon: CalendarDays,
    description: "Eventos, encuentros, ferias y actividades de la comunidad aeronáutica.",
  },
  {
    title: "Empresas y servicios",
    initials: "ES",
    icon: Building2,
    description: "Conocé empresas y profesionales que ofrecen productos y servicios para el sector.",
  },
  {
    title: "Foro de la comunidad",
    initials: "FC",
    icon: MessagesSquare,
    description:
      "Participá de debates, consultas técnicas, historias y novedades con otros apasionados de la aviación.",
  },
];

const FLIGHT_PLAN_STEPS = [
  { name: "Aeronave", detail: "Matrícula, tipo y equipo, en lenguaje simple." },
  { name: "Ruta", detail: "Rumbos, distancia y tiempo de cada tramo." },
  { name: "Vuelo", detail: "Hora argentina convertida a UTC, nivel y autonomía." },
  { name: "Briefing", detail: "METAR, TAF, SIGMET, sol y combustible." },
  { name: "Resultado", detail: "Formulario OACI, mensaje FPL y PDF." },
];

/** Ficha de una herramienta, como las de categorías. */
function ToolCard({ href, icon: Icon, title, description, action }: { href: string; icon: LucideIcon; title: string; description: string; action: string }) {
  return (
    <Link
      href={href}
      className="group flex h-fit flex-col gap-5 rounded-[28px] border border-[#00205B]/10 bg-white p-6 shadow-[var(--m-shadow)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[var(--m-shadow-hover)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5FC] text-[#00205B] transition-all duration-300 group-hover:-rotate-6 group-hover:bg-[#00205B] group-hover:text-white">
        <Icon aria-hidden className="h-7 w-7" />
      </span>
      <div>
        <h3 className="font-heading text-[1.4rem] leading-tight font-extrabold tracking-[-0.02em] text-[#00205B]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
      <span className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[#00205B]/20 px-5 text-sm font-bold text-[#00205B] transition-colors group-hover:border-[#00205B] group-hover:bg-[#00205B] group-hover:text-white">
        {action}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </span>
    </Link>
  );
}

// Rediseño (26/10): con las piezas del resto del sitio. "Disponible ahora": las guías en un banner azul
// con rutas animadas (como "Guías de ayuda" en la Home) y el índice en una placa; el comparador en una
// ficha. "Próximamente": fichas como las categorías de repuestos (iniciales + ícono). Cierre en tarjeta
// roja con las barras del logo, como el cartel de publicar.
export default async function ServicesPage() {
  const flightPlan = flightPlanEnabled();
  return (
    <main className="relative min-h-[calc(100vh-80px)] container mx-auto px-4 py-12 pb-20">
      <PageBackground page="default" />
      <Breadcrumbs items={[{ label: "Servicios" }]} className="mx-auto max-w-5xl -mt-8 mb-4" />

      <div className="mx-auto max-w-5xl space-y-14">
        {/* Encabezado */}
        <PageHeader variant="plain"
          routeId="va-route-services"
          title="Todo el ecosistema aeronáutico, en un solo lugar."
          subtitle={
            flightPlan
              ? "Estamos construyendo la próxima etapa de Ventas Aeronáuticas. Hoy podés publicar y encontrar aeronaves y repuestos, armar tu plan de vuelo y consultar nuestras guías para comprar y vender con más seguridad. Muy pronto vas a encontrar también los servicios y profesionales que hacen posible que la aviación siga en el aire."
              : "Estamos construyendo la próxima etapa de Ventas Aeronáuticas. Hoy podés publicar y encontrar aeronaves y repuestos, y ya tenés disponibles nuestras guías para comprar y vender con más seguridad. Muy pronto vas a encontrar también los servicios y profesionales que hacen posible que la aviación siga en el aire."
          }
        />

        {/* Disponible ahora */}
        <section aria-labelledby="available-now" className="space-y-8">
          <DisplayTitle id="available-now">Disponible ahora</DisplayTitle>

          {flightPlan && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              {/* Plan de vuelo: banner de la marca con los 5 pasos adentro */}
              <div className="relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(120deg,#0A4C96_0%,#00205B_72%)] p-6 text-white shadow-[0_24px_50px_-28px_rgb(10_76_150/0.9)] ring-1 ring-white/10 sm:p-8">
                <FlightPaths id="va-route-services-flight-plan" tone="dark" className="-z-10" />
                <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00205B]">Sin cuenta</span>
                <h3 className="mt-4 font-heading text-[1.75rem] leading-tight font-extrabold tracking-[-0.025em] sm:text-[2.1rem]">Plan de vuelo</h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">Con los aeródromos y LAD de Argentina, paso a paso desde el celular o la computadora. Con tu cuenta, además lo guardás.</p>
                <ol className="mt-6 divide-y divide-[#00205B]/10 rounded-[22px] bg-white px-5 text-[#00205B] shadow-[0_14px_34px_-16px_rgb(0_19_49/0.6)] sm:px-6">
                  {FLIGHT_PLAN_STEPS.map((step, i) => (
                    <li key={step.name} className="flex items-baseline gap-3 py-3 text-sm">
                      <span className="font-heading font-extrabold tabular-nums text-[#D62828]">{i + 1}</span>
                      <span>
                        <span className="font-bold">{step.name}.</span> <span className="text-slate-600">{step.detail}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <Link href={FLIGHT_PLAN_PATH} className="group mt-6 inline-flex min-h-12 items-center gap-3 rounded-full bg-white pl-6 pr-1.5 text-sm font-bold text-[#00205B] shadow-lg transition-transform hover:scale-[1.02]">
                  Armar un plan de vuelo
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D62828] text-white">
                    <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>
              <div className="grid h-fit gap-6">
                <ToolCard href={MAP_PATH} icon={MapIcon} title="Mapa aeronáutico" description="Aeródromos, helipuertos y LAD con su ficha, METAR y SIGMET vigentes." action="Abrir el mapa" />
                <ToolCard href={CALCULATORS_PATH} icon={Calculator} title="Calculadoras" description={`${CALCULATORS.length} herramientas libres: clima, viento cruzado, altitud de densidad, combustible, peso y balance y más.`} action="Ver las calculadoras" />
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            {/* Guías: banner de la marca con el índice adentro */}
            <div className="relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(120deg,#0A4C96_0%,#00205B_72%)] p-6 text-white shadow-[0_24px_50px_-28px_rgb(10_76_150/0.9)] ring-1 ring-white/10 sm:p-8">
              <FlightPaths id="va-route-services-guides" tone="dark" className="-z-10" />
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00205B]">
                Disponible
              </span>
              <h3 className="mt-4 font-heading text-[1.75rem] leading-tight font-extrabold tracking-[-0.025em] sm:text-[2.1rem]">
                Guías para comprar y vender
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
                Checklist de pre-compra, cómo vender más rápido, el trámite de transferencia ante ANAC y un glosario con TT, SMOH, TBO y
                más.
              </p>
              <div className="mt-6 rounded-[22px] bg-white px-5 text-[#00205B] shadow-[0_14px_34px_-16px_rgb(0_19_49/0.6)] sm:px-6">
                <GuideIndex guides={await getPublishedGuides()} />
              </div>
              <Link
                href={GUIDES_PATH}
                className="group mt-6 inline-flex min-h-12 items-center gap-3 rounded-full bg-white pl-6 pr-1.5 text-sm font-bold text-[#00205B] shadow-lg transition-transform hover:scale-[1.02]"
              >
                Ver las guías
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D62828] text-white">
                  <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>

            {/* Comparador: ficha como las de categorías */}
            <ToolCard href="/aircraft/compare" icon={Columns3} title="Comparador de aeronaves" description="Elegí hasta 3 aeronaves publicadas y comparalas dato por dato: horas, motor, aviónica y precio." action="Abrir el comparador" />
          </div>
        </section>

        {/* Próximamente: solo estas 6 son a futuro */}
        <section aria-labelledby="coming-soon" className="space-y-8">
          <DisplayTitle id="coming-soon">Próximamente</DisplayTitle>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {upcomingServices.map((service) => (
              <li
                key={service.title}
                className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] border border-[#00205B]/10 bg-white p-5 shadow-[var(--m-shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span aria-hidden className="font-heading text-[2.25rem] leading-none font-black tracking-[-0.04em] text-[#0A4C96]/15">
                    {service.initials}
                  </span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF5FC] text-[#00205B]">
                    <service.icon aria-hidden className="h-6 w-6" />
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#00205B]">{service.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{service.description}</p>
                </div>
                <span className="mt-auto w-fit rounded-full bg-[#00205B]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00205B]">
                  Próximamente
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Cierre: tarjeta roja con las barras del logo */}
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#D62828_0%,#B71F1F_100%)] p-6 text-white shadow-[0_24px_48px_-20px_rgb(183_31_31/0.6)] sm:p-8">
          <BrandBars className="right-[12%] -z-10" />
          <h2 className="font-heading text-[1.6rem] leading-tight font-extrabold tracking-[-0.025em] sm:text-[2rem]">
            Estamos recién despegando.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white">
            Nuestro objetivo es construir un punto de encuentro para todo el sector aeronáutico argentino: aeronaves, repuestos, servicios,
            profesionales, empresas y oportunidades. Hoy ya podés comprar, vender{flightPlan ? ", armar tu plan de vuelo" : ""} y consultar nuestras guías. El resto está en camino.
          </p>
        </div>
      </div>
    </main>
  );
}
