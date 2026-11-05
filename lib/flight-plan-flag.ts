// VA-191: la sección "Plan de vuelo" se ve solo donde esté FLIGHT_PLAN_ENABLED=true (hoy, el ambiente Preview de
// Vercel). Apagada: las rutas responden 404 y no hay links, menús ni filas en /plans.
export const flightPlanEnabled = () => process.env.FLIGHT_PLAN_ENABLED === "true";

export const FLIGHT_PLAN_PATH = "/services/flight-plan";
export const CALCULATORS_PATH = "/services/flight-plan/calculators";
