import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sortAircraftCategories } from "@/lib/aircraft-categories";

// Datos que casi no cambian y se pedían en cada request (VA-13). Se cachean con tags y las
// actions de taxonomía (app/actions/admin-taxonomy-actions.ts) los invalidan con updateTag.
// Sin cacheComponents, unstable_cache es la forma documentada (ver
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md).

export const AIRCRAFT_TAXONOMY_TAG = "aircraft-taxonomy";
export const SPAREPART_CATEGORIES_TAG = "sparepart-categories";

// Categorías de aeronave + marcas → modelos → variantes (filtros de /aircraft y marcas de la Home).
export const getAircraftTaxonomy = unstable_cache(
  async () => {
    const [categories, brands] = await Promise.all([
      prisma.aircraftCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }).then(sortAircraftCategories),
      // VA-190: sin lo que el admin ocultó.
      prisma.aircraftBrand.findMany({
        where: { hidden: false },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          models: {
            where: { hidden: false },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              recommendedCategoryId: true,
              variants: {
                orderBy: { name: "asc" },
                select: { id: true, name: true, categoryOverride: true },
              },
            },
          },
        },
      }),
    ]);
    return { categories, brands };
  },
  // VA-148/VA-149: clave nueva para no servir el orden y los nombres de íconos viejos cacheados.
  ["aircraft-taxonomy", "va190"], // VA-190: sin las entradas ocultas
  { tags: [AIRCRAFT_TAXONOMY_TAG], revalidate: 3600 }
);

// Todas las categorías de repuestos (árbol plano con parentId).
export const getSparePartCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
      orderBy: { name: "asc" },
    }),
  ["sparepart-categories", "va96"],
  { tags: [SPAREPART_CATEGORIES_TAG], revalidate: 3600 }
);

export const unansweredQuestionsTag = (userId: string) => `unanswered-questions:${userId}`;

// Puntito rojo del header: ¿el usuario tiene preguntas recibidas sin responder?
// Antes era un count con dos joins en cada página; ahora se cachea 60 s por usuario y se
// invalida al preguntar o responder (app/actions/questions.ts).
export function hasUnansweredQuestions(userId: string) {
  return unstable_cache(
    async () => {
      const pending = await prisma.question.findFirst({
        where: {
          answer: null,
          OR: [{ aircraft: { sellerId: userId } }, { sparePart: { sellerId: userId } }],
        },
        select: { id: true },
      });
      return Boolean(pending);
    },
    ["unanswered-questions", userId],
    { tags: [unansweredQuestionsTag(userId)], revalidate: 60 }
  )();
}
