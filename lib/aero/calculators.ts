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

/** Título y descripción para buscadores. */
export const CALCULATOR_SEO: Record<CalculatorSlug, { title: string; description: string }> = {
  "weather": { title: "METAR y TAF de aeródromos argentinos", description: "Consultá el METAR y el TAF de los aeródromos de Argentina en lenguaje claro: viento, visibilidad, nubes, QNH y categoría de vuelo. Gratis y sin cuenta." },
  "crosswind": { title: "Calculadora de viento cruzado", description: "Calculá las componentes de viento de frente, de cola y cruzado para una pista. Gratis, sin cuenta y desde el celular." },
  "wind-triangle": { title: "Calculadora de triángulo de viento y deriva", description: "Calculá rumbo, deriva y velocidad sobre tierra para una derrota, con el viento y tu velocidad verdadera. Gratis y sin cuenta." },
  "time-speed-distance": { title: "Calculadora de tiempo, velocidad y distancia para pilotos", description: "Cargá dos de los tres valores y obtené el tercero, en nudos y millas náuticas. Gratis y sin cuenta." },
  "top-of-descent": { title: "Calculadora de inicio de descenso (TOD)", description: "Calculá a qué distancia empezar a bajar y con qué régimen, según tu altitud y velocidad sobre tierra. Gratis y sin cuenta." },
  "local-utc": { title: "Conversor de hora argentina a UTC", description: "Pasá de hora argentina a UTC y al revés, con el cambio de día, para tu plan de vuelo. Gratis y sin cuenta." },
  "sun": { title: "Salida y puesta del sol y crepúsculo civil", description: "Consultá la salida y la puesta del sol y el fin del crepúsculo civil en un aeródromo o en tu ubicación, para los próximos días." },
  "density-altitude": { title: "Calculadora de altitud de densidad", description: "Calculá la altitud de presión, la temperatura ISA y la altitud de densidad con la elevación, el QNH y la temperatura. Gratis y sin cuenta." },
  "fuel": { title: "Calculadora de combustible para un vuelo", description: "Calculá el combustible de vuelo, rodaje y la reserva que definas, con el desglose. Gratis y sin cuenta." },
  "weight-balance": { title: "Calculadora de peso y balance", description: "Calculá el peso total y el centro de gravedad con los datos del manual de vuelo de tu aeronave. Gratis y sin cuenta." },
  "cost-per-hour": { title: "Calculadora de costo por hora de vuelo", description: "Estimá cuánto cuesta volar tu aeronave por hora: costos fijos, variables y reserva para la recorrida. Gratis y sin cuenta." },
  "unit-converter": { title: "Conversor de unidades aeronáuticas", description: "Convertí peso, combustible, velocidad, altura, presión y temperatura entre las unidades de aviación. Gratis y sin cuenta." },
};

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
