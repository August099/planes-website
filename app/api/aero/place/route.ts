import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";

// VA-191: datos de un aeródromo o LAD para su ficha. Solo lectura de datos públicos.
export const dynamic = "force-dynamic";

export type AeroPlaceDetail = {
  kind: "AD" | "HELIPORT" | "LAD" | "LADH";
  source: "MADHEL" | "LAD";
  code: string;
  icao: string | null;
  iata: string | null;
  name: string;
  fir: string | null;
  province: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  elevationM: number | null;
  condition: string | null;
  runways: string[];
  frequencies: string[];
  seeAip: boolean;
};

export async function GET(req: NextRequest) {
  if (!flightPlanEnabled()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const source = req.nextUrl.searchParams.get("source");
  const code = req.nextUrl.searchParams.get("code");
  if ((source !== "MADHEL" && source !== "LAD") || !code) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  const place = await prisma.aeroPlace.findUnique({ where: { source_code: { source, code } } });
  if (!place) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const detail: AeroPlaceDetail = {
    kind: place.kind,
    source,
    code: place.code,
    icao: place.icao,
    iata: place.iata,
    name: place.name,
    fir: place.fir,
    province: place.province,
    location: place.location,
    lat: place.lat,
    lng: place.lng,
    elevationM: place.elevationM,
    condition: place.condition,
    runways: (place.runways ?? []) as string[],
    frequencies: (place.frequencies ?? []) as string[],
    seeAip: (place.details as { seeAip?: boolean } | null)?.seeAip === true,
  };
  return NextResponse.json(detail, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
