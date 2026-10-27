import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// React.cache: generateMetadata y la página del detalle comparten una sola consulta por request.

// Datos públicos del vendedor que muestra el detalle. Viene en la misma consulta que la
// publicación (antes era una query aparte, en serie, y traía la fila entera del usuario; VA-13).
const SELLER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  logoUrl: true,
  city: true,
  province: true,
} as const;

export const getAircraftDetail = cache(async (id: string) => {
  return prisma.aircraft.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      engines: true,
      propeller: true,
      documents: true,
      brand: true,
      model: true,
      subModel: true,
      category: true,
      seller: { select: SELLER_PUBLIC_SELECT },
      questions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });
});

export const getSparePartDetail = cache(async (id: string) => {
  return prisma.sparePart.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      // La categoría guardada puede ser una Subcategoría o, si existe, una
      // Sección (sub-subcategoría). Traemos hasta dos niveles de "parent"
      // para poder reconstruir la jerarquía completa: Categoría > Subcategoría > Sección.
      category: {
        include: {
          parent: {
            include: {
              parent: true,
            },
          },
        },
      },
      seller: { select: SELLER_PUBLIC_SELECT },
      questions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });
});

// VA-84: detalle de hangar. Preguntas y favoritos se suman con la integración (pendiente).
export const getHangarDetail = cache(async (id: string) => {
  return prisma.hangar.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      seller: { select: SELLER_PUBLIC_SELECT },
    },
  });
});

export type AircraftDetail = NonNullable<Awaited<ReturnType<typeof getAircraftDetail>>>;
export type SparePartDetail = NonNullable<Awaited<ReturnType<typeof getSparePartDetail>>>;
export type HangarDetail = NonNullable<Awaited<ReturnType<typeof getHangarDetail>>>;
