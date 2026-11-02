import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { searchTokens } from "@/lib/search-text";

// 3/11: los filtros de Prisma no ignoran acentos y la extensión unaccent de Postgres pediría una migración, así
// que el texto se compara con translate(). Devuelven ids: quien llama suma el resto de las condiciones.
// Cada palabra tiene que aparecer en alguno de los campos.

function matches(searchable: Prisma.Sql, tokens: string[]): Prisma.Sql {
  const folded = Prisma.sql`translate(lower(${searchable}), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc')`;
  return Prisma.join(
    tokens.map((token) => Prisma.sql`${folded} LIKE ${`%${token}%`}`),
    " AND "
  );
}

export async function aircraftIdsMatching(query: string): Promise<string[]> {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];
  const searchable = Prisma.sql`concat_ws(' ', a."title", a."description", a."city", a."province", a."customBrand", a."customModel", b."name", m."name", c."name")`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT a."id"
    FROM "Aircraft" a
    LEFT JOIN "AircraftBrand" b ON b."id" = a."brandId"
    LEFT JOIN "AircraftModel" m ON m."id" = a."modelId"
    LEFT JOIN "AircraftCategory" c ON c."id" = a."categoryId"
    WHERE ${matches(searchable, tokens)}
  `;
  return rows.map((r) => r.id);
}

export async function sparePartIdsMatching(query: string): Promise<string[]> {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];
  const searchable = Prisma.sql`concat_ws(' ', s."title", s."description", s."partNumber", s."brand", s."city", s."province", c."name")`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT s."id"
    FROM "SparePart" s
    LEFT JOIN "Category" c ON c."id" = s."categoryId"
    WHERE ${matches(searchable, tokens)}
  `;
  return rows.map((r) => r.id);
}
