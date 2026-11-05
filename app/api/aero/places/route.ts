import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";
import { searchTokens } from "@/lib/search-text";

// VA-191: búsqueda de aeródromos y LAD, sin distinguir acentos. Lo que trae es público y cambia una vez por mes.
export const dynamic = "force-dynamic";

export type AeroPlaceResult = {
  kind: "AD" | "HELIPORT" | "LAD" | "LADH";
  code: string;
  icao: string | null;
  name: string;
  province: string | null;
  lat: number | null;
  lng: number | null;
  elevationM: number | null;
};

export async function GET(req: NextRequest) {
  if (!flightPlanEnabled()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const tokens = searchTokens(req.nextUrl.searchParams.get("q") ?? "");
  if (tokens.join("").length < 2) return NextResponse.json([]);

  const folded = Prisma.sql`translate(lower(concat_ws(' ', "code", "icao", "iata", "name", "province", "location")), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc')`;
  const first = tokens[0];
  const rows = await prisma.$queryRaw<AeroPlaceResult[]>`
    SELECT "kind", "code", "icao", "name", "province", "lat", "lng", "elevationM"
    FROM "AeroPlace"
    WHERE ${Prisma.join(
      tokens.map((t) => Prisma.sql`${folded} LIKE ${`%${t}%`}`),
      " AND "
    )}
    ORDER BY
      CASE WHEN lower("icao") = ${first} OR lower("code") = ${first} THEN 0 ELSE 1 END,
      CASE WHEN "kind" = 'AD' THEN 0 ELSE 1 END,
      "name"
    LIMIT 10
  `;
  return NextResponse.json(rows, { headers: { "Cache-Control": "public, max-age=300" } });
}
