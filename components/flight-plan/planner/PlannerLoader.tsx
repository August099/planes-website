"use client";

import dynamic from "next/dynamic";
import type { PlannerProps } from "@/components/flight-plan/planner/FlightPlanner";

// Sin SSR: el plan en curso está en el navegador, y así el mapa y los cálculos bajan solo en esta página.
const FlightPlanner = dynamic(() => import("@/components/flight-plan/planner/FlightPlanner").then((m) => m.FlightPlanner), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-600">Cargando el plan de vuelo…</p>,
});

export function PlannerLoader(props: PlannerProps) {
  return <FlightPlanner {...props} />;
}
