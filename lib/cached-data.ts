import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getMissingProfileFields, type ProfileField } from "@/lib/profile";

// Datos que casi no cambian y se pedían en cada request (VA-13). Se cachean con tags y las
// actions de taxonomía (app/actions/admin-taxonomy-actions.ts) los invalidan con updateTag.
// Sin cacheComponents, unstable_cache es la forma documentada (ver
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md).

export const AIRCRAFT_TAXONOMY_TAG = "aircraft-taxonomy";
export const SPAREPART_CATEGORIES_TAG = "sparepart-categories";

// Categorías de aeronave + marcas → modelos → variantes (filtros de /planes y marcas de la Home).
export const getAircraftTaxonomy = unstable_cache(
  async () => {
    const [categories, brands] = await Promise.all([
      prisma.aircraftCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.aircraftBrand.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          models: {
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              defaultCategoryId: true,
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
  ["aircraft-taxonomy"],
  { tags: [AIRCRAFT_TAXONOMY_TAG], revalidate: 3600 }
);

// Todas las categorías de repuestos (árbol plano con parentId).
export const getSparePartCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
      orderBy: { name: "asc" },
    }),
  ["sparepart-categories"],
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

export const profileCompletenessTag = (userId: string) => `profile-completeness:${userId}`;

// Punto rojo del header por perfil incompleto (VA-46). Cacheado 60 s por usuario; lo invalida
// updateProfileAction al guardar el perfil.
export function getMissingProfileFieldsCached(userId: string): Promise<ProfileField[]> {
  return unstable_cache(
    async () => {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, city: true, province: true, emailVerified: true, passwordHash: true },
      });
      return u ? getMissingProfileFields(u) : [];
    },
    ["profile-completeness", userId],
    { tags: [profileCompletenessTag(userId)], revalidate: 60 }
  )();
}
