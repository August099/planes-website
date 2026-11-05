// VA-191: prendida por defecto: la sección se limita con las ramas (va a pre-production; a main, solo cuando los
// socios lo pidan). FLIGHT_PLAN_ENABLED=false la apaga: las rutas responden 404 y no hay links, menús ni filas en /plans.
export const flightPlanEnabled = () => process.env.FLIGHT_PLAN_ENABLED !== "false";

export const FLIGHT_PLAN_PATH = "/services/flight-plan";
export const CALCULATORS_PATH = "/services/flight-plan/calculators";
