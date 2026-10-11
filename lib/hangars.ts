import type {
  HangarAircraftType,
  HangarRentPeriod,
  HangarRentalType,
  HangarService,
  HangarSpaceType,
  ListingCurrency,
} from "@prisma/client";

// VA-84: etiquetas y formatos de los hangares, compartidos por la tarjeta, el listado, el detalle
// (y más adelante el formulario y el PDF). Solo import de tipos de Prisma: se usa en el cliente.

export const HANGARS_PATH = "/services/hangars";
export const hangarPath = (id: string) => `${HANGARS_PATH}/hangar-details/${id}`;

export const RENTAL_TYPE_LABELS: Record<HangarRentalType, string> = {
  SHARED_SPACE: "Espacio en hangar compartido",
  WHOLE_HANGAR: "Hangar completo",
};

export const SPACE_TYPE_LABELS: Record<HangarSpaceType, string> = {
  INDIVIDUAL: "Hangar individual",
  SHARED: "Hangar compartido",
  PLATFORM: "Plataforma descubierta",
};

export const RENT_PERIOD_LABELS: Record<HangarRentPeriod, string> = {
  NIGHT: "por noche",
  DAY: "por día",
  MONTH: "por mes",
  YEAR: "por año",
};

export const AIRCRAFT_TYPE_LABELS: Record<HangarAircraftType, string> = {
  SINGLE_ENGINE: "Monomotor",
  TWIN_ENGINE: "Bimotor",
  HELICOPTER: "Helicóptero",
  LIGHT_JET: "Jet liviano",
  GLIDER: "Planeador",
  ULTRALIGHT: "Ultraliviano",
};

export const SERVICE_LABELS: Record<HangarService, string> = {
  ELECTRICITY: "Electricidad",
  WATER: "Agua",
  BATHROOM: "Baño",
  OFFICE_STORAGE: "Oficina o depósito",
  SECURITY: "Vigilancia o cámaras",
  ACCESS_24H: "Acceso 24 h",
  FUEL: "Combustible en la pista",
  WORKSHOP: "Taller en la pista",
  FLIGHT_SCHOOL: "Escuela de vuelo en la pista",
  LIGHTED_RUNWAY: "Pista iluminada",
};

// Tipo de publicación para el filtro y la tarjeta: alquiler de espacio, de hangar completo o venta.
export const OFFER_TYPES = [
  { value: "rent-shared", label: "Alquiler de espacio compartido" },
  { value: "rent-whole", label: "Alquiler de hangar completo" },
  { value: "sale", label: "Venta" },
] as const;
export type OfferType = (typeof OFFER_TYPES)[number]["value"];

const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const METERS = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export function formatMoney(amount: unknown, currency: ListingCurrency): string | null {
  const n = amount === null || amount === undefined || amount === "" ? NaN : Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${currency === "USD" ? "US$" : "AR$"} ${NUMBER.format(n)}`;
}

export const meters = (n: number | null | undefined) => (n == null ? null : `${METERS.format(n)} m`);

/** "Puerta 12 × 3,5 m" */
export function doorText(width: number, height: number) {
  return `Puerta ${METERS.format(width)} × ${METERS.format(height)} m`;
}

type PriceSource = {
  offersSale: boolean;
  salePrice: unknown;
  saleCurrency: ListingCurrency;
  offersRent: boolean;
  rentPrice: unknown;
  rentCurrency: ListingCurrency;
  rentPeriod: HangarRentPeriod | null;
};

/**
 * Precios para la tarjeta (pedido del socio, 11/10): si tiene venta y alquiler, la venta va
 * grande arriba y el alquiler abajo más chico, con su período; si tiene uno solo, ese va grande.
 * Un precio vacío con la opción marcada es "A convenir".
 */
export function hangarPrices(h: PriceSource) {
  const sale = h.offersSale ? formatMoney(h.salePrice, h.saleCurrency) ?? "A convenir" : null;
  const rentAmount = h.offersRent ? formatMoney(h.rentPrice, h.rentCurrency) : null;
  const period = h.rentPeriod ? RENT_PERIOD_LABELS[h.rentPeriod] : "";
  const rent = h.offersRent ? (rentAmount ? { amount: rentAmount, period } : { amount: "A convenir", period: "" }) : null;

  if (sale && rent) return { main: { amount: sale, suffix: "" }, secondary: { label: "Alquiler", amount: rent.amount, period: rent.period } };
  if (sale) return { main: { amount: sale, suffix: "" }, secondary: null };
  if (rent) return { main: { amount: rent.amount, suffix: rent.period }, secondary: null };
  return { main: { amount: "A convenir", suffix: "" }, secondary: null };
}

/** "Venta", "Alquiler · Hangar completo", "Venta y alquiler · Espacio compartido"… */
export function offerLabel(h: { offersSale: boolean; offersRent: boolean; rentalType: HangarRentalType | null }) {
  const rental = h.rentalType ? RENTAL_TYPE_LABELS[h.rentalType].replace("Espacio en hangar compartido", "Espacio compartido") : null;
  if (h.offersSale && h.offersRent) return rental ? `Venta y alquiler · ${rental}` : "Venta y alquiler";
  if (h.offersRent) return rental ? `Alquiler · ${rental}` : "Alquiler";
  return "Venta";
}
