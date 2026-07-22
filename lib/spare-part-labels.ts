import type { SparePartCategory, SparePartCondition } from "@prisma/client";

export const sparePartCategoryLabels: Record<SparePartCategory, string> = {
  MECANICO: "Mecánico",
  ESTRUCTURAL: "Estructural",
  PIEZA_MOVIL: "Pieza móvil",
  AVIONICA_Y_RADIO: "Aviónica y radio",
  EQUIPO_DE_FUMIGACION: "Equipo de fumigación",
};

export const sparePartConditionLabels: Record<SparePartCondition, string> = {
  NUEVO: "Nuevo",
  USADO: "Usado",
  REMANUFACTURADO: "Remanufacturado",
};