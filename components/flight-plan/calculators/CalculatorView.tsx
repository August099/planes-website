"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { CalculatorSlug } from "@/lib/aero/calculators";

// Cada calculadora baja solo su parte. Sin SSR: leen la URL y lo guardado en el navegador al abrir.
const loading = () => <p className="text-sm text-slate-600">Cargando la calculadora…</p>;
const nav = () => import("./NavigationCalculators");
const perf = () => import("./PerformanceCalculators");

const VIEWS: Record<CalculatorSlug, ComponentType> = {
  weather: dynamic(() => import("./WeatherCalculator").then((m) => m.WeatherCalculator), { ssr: false, loading }),
  crosswind: dynamic(() => nav().then((m) => m.CrosswindCalculator), { ssr: false, loading }),
  "wind-triangle": dynamic(() => nav().then((m) => m.WindTriangleCalculator), { ssr: false, loading }),
  "time-speed-distance": dynamic(() => nav().then((m) => m.TimeSpeedDistanceCalculator), { ssr: false, loading }),
  "top-of-descent": dynamic(() => nav().then((m) => m.TopOfDescentCalculator), { ssr: false, loading }),
  "local-utc": dynamic(() => nav().then((m) => m.LocalUtcCalculator), { ssr: false, loading }),
  sun: dynamic(() => import("./SunCalculator").then((m) => m.SunCalculator), { ssr: false, loading }),
  "density-altitude": dynamic(() => perf().then((m) => m.DensityAltitudeCalculator), { ssr: false, loading }),
  fuel: dynamic(() => perf().then((m) => m.FuelCalculator), { ssr: false, loading }),
  "weight-balance": dynamic(() => perf().then((m) => m.WeightBalanceCalculator), { ssr: false, loading }),
  "cost-per-hour": dynamic(() => perf().then((m) => m.CostPerHourCalculator), { ssr: false, loading }),
  "unit-converter": dynamic(() => perf().then((m) => m.UnitConverter), { ssr: false, loading }),
};

export function CalculatorView({ slug }: { slug: CalculatorSlug }) {
  const View = VIEWS[slug];
  return <View />;
}
