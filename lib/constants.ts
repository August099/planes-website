// ==========================================
// 1. DICCIONARIOS DE LABELS (Traducciones)
// ==========================================

export const PLAN_TYPE_LABELS: Record<string, string> = {
  AIRCRAFT_PACK: "Pack de aeronaves",
  SPARE_PART_PACK: "Pack de repuestos",
  AD_BANNER: "Banner publicitario",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export const AD_BANNER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PENDING_REVIEW: "En revisión",
  ACTIVE: "Activo",
  EXPIRED: "Expirado",
  REJECTED: "Rechazado",
};

export const AIRCRAFT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  EXPIRED: "Expirada",
  PENDING_PAYMENT: "Pendiente de pago",
};

export const AIRCRAFT_CATEGORY_LABELS: Record<string, string> = {
  PISTON: "Pistón",
  TURBOHELICE: "Turbohélice",
  EXPERIMENTAL: "Experimental",
  HELICOPTERO: "Helicóptero",
  PROYECTO: "Proyecto",
};

export const AIRCRAFT_BRAND_LABELS: Record<string, string> = {
  AIR_TRACTOR: "Air Tractor",
  CESSNA: "Cessna",
  PIPER: "Piper",
  PZL: "PZL",
  GRUMMAN: "Grumman",
  EMBRAER: "Embraer",
  BELL: "Bell",
  CICARE: "Cicaré",
  AIRBUS: "Airbus",
  AERO_BOERO: "Aero Boero",
  BEECHCRAFT: "Beechcraft",
  OTHER: "Otra marca",
};

export const SPARE_PART_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  ACTIVE: "Activo",
  EXPIRED: "Expirado",
  SOLD: "Vendido",
};

export const SPARE_PART_CATEGORY_LABELS: Record<string, string> = {
  MECANICO: "Mecánico",
  ESTRUCTURAL: "Estructural",
  PIEZA_MOVIL: "Pieza móvil",
  AVIONICA_Y_RADIO: "Aviónica y radio",
  EQUIPO_DE_FUMIGACION: "Equipo de fumigación",
};

export const SPARE_PART_CONDITION_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  USADO: "Usado",
  REMANUFACTURADO: "Remanufacturado",
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  REVIEWED: "Revisado",
  DISMISSED: "Desestimado",
};

// ==========================================
// 2. FUNCIONES HELPER FORMATO GENERATOR
// ==========================================

/**
 * Devuelve el texto amigable formateado para cualquier valor de enum.
 * Si el valor es nulo, indefinido o no existe en el mapa, devuelve un string vacío o el valor original.
 */
export function formatEnum(
  value?: string | null,
  labelsMap?: Record<string, string>
): string {
  if (!value) return "";
  if (labelsMap && labelsMap[value]) {
    return labelsMap[value];
  }
  // Fallback si no hay mapa: reemplaza guiones bajos por espacios y capitaliza palabras
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
}