// VA-191: lista de calculadoras (índice, menú interno y metadata). Cada una tiene su URL.
export type CalculatorSlug =
  | "weather"
  | "crosswind"
  | "wind-triangle"
  | "time-speed-distance"
  | "top-of-descent"
  | "local-utc"
  | "sun"
  | "density-altitude"
  | "fuel"
  | "weight-balance"
  | "cost-per-hour"
  | "unit-converter";

export type CalculatorMeta = { slug: CalculatorSlug; name: string; description: string; group: string };

export const CALCULATORS: CalculatorMeta[] = [
  { slug: "weather", name: "Clima aeronáutico", description: "METAR y TAF en lenguaje claro, y el aeródromo más cercano.", group: "Navegación" },
  { slug: "crosswind", name: "Viento cruzado", description: "Componentes de frente o de cola y cruzada para una pista.", group: "Navegación" },
  { slug: "wind-triangle", name: "Triángulo de viento", description: "Rumbo, deriva y velocidad sobre tierra para una derrota.", group: "Navegación" },
  { slug: "time-speed-distance", name: "Tiempo, velocidad y distancia", description: "Cargá dos de los tres valores y calcula el otro.", group: "Navegación" },
  { slug: "top-of-descent", name: "Inicio de descenso", description: "A qué distancia y con qué régimen empezar a bajar.", group: "Navegación" },
  { slug: "local-utc", name: "Hora local y UTC", description: "De hora argentina a UTC y al revés, con cambio de día.", group: "Navegación" },
  { slug: "sun", name: "Sol y crepúsculo", description: "Salida y puesta del sol y crepúsculo civil de los próximos días.", group: "Navegación" },
  { slug: "density-altitude", name: "Altitud de densidad", description: "Altitud de presión, temperatura ISA y altitud de densidad.", group: "Performance" },
  { slug: "fuel", name: "Combustible necesario", description: "Vuelo, rodaje y la reserva que cargues, con el desglose.", group: "Performance" },
  { slug: "weight-balance", name: "Peso y balance", description: "Peso total y centro de gravedad según tu manual de vuelo.", group: "Performance" },
  { slug: "cost-per-hour", name: "Costo por hora", description: "Costos fijos, variables y reserva para la recorrida.", group: "Costos y unidades" },
  { slug: "unit-converter", name: "Conversor de unidades", description: "Peso, combustible, velocidad, altura, presión y temperatura.", group: "Costos y unidades" },
];

export const calculatorBySlug = (slug: string) => CALCULATORS.find((c) => c.slug === slug);
