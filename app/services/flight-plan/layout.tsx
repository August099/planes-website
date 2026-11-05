import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { FlightPlanTabs } from "@/components/flight-plan/FlightPlanTabs";

// VA-191: sin FLIGHT_PLAN_ENABLED, toda la sección responde 404. Fuera de los buscadores hasta el lanzamiento.
export const metadata: Metadata = { title: "Plan de vuelo", robots: { index: false, follow: false } };

export default function FlightPlanLayout({ children }: { children: React.ReactNode }) {
  if (!flightPlanEnabled()) notFound();
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <PageBackground page="default" />
      <div className="container mx-auto max-w-6xl px-4 pt-6 pb-20">
        <Breadcrumbs items={[{ label: "Servicios", href: "/services" }, { label: "Plan de vuelo" }]} className="mb-6" />
        <PageHeader variant="plain" routeId="va-route-flight-plan" className="mb-8" title="Plan de vuelo" />
        <FlightPlanTabs />
        <div className="mt-8">{children}</div>
        <p className="mt-10 border-t border-[#00205B]/15 pt-4 text-xs leading-relaxed text-slate-600">
          Herramienta orientativa. No reemplaza el AIP, los NOTAM ni la información meteorológica oficial, ni la planificación del piloto. Tampoco reemplaza la información obtenida previa al vuelo en la oficina ARO-AIS del aeródromo de partida.
        </p>
      </div>
    </main>
  );
}
