// VA-171: provincias por su código ISO 3166-2:AR (el que manda Vercel en x-vercel-ip-country-region).
export const AR_REGION_NAMES: Record<string, string> = {
  A: "Salta",
  B: "Buenos Aires",
  C: "Ciudad de Buenos Aires",
  D: "San Luis",
  E: "Entre Ríos",
  F: "La Rioja",
  G: "Santiago del Estero",
  H: "Chaco",
  J: "San Juan",
  K: "Catamarca",
  L: "La Pampa",
  M: "Mendoza",
  N: "Misiones",
  P: "Formosa",
  Q: "Neuquén",
  R: "Río Negro",
  S: "Santa Fe",
  T: "Tucumán",
  U: "Chubut",
  V: "Tierra del Fuego",
  W: "Corrientes",
  X: "Córdoba",
  Y: "Jujuy",
  Z: "Santa Cruz",
};

export const regionName = (code: string) => AR_REGION_NAMES[code] ?? code;
