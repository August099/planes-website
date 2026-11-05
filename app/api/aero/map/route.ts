import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";

// VA-191: aeródromos y LAD para el mapa, solo con lo necesario para dibujarlos. Los datos cambian una vez por mes.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!flightPlanEnabled()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const places = await prisma.aeroPlace.findMany({
    where: { lat: { not: null }, lng: { not: null } },
    select: { kind: true, source: true, code: true, icao: true, name: true, lat: true, lng: true },
  });
  return NextResponse.json(
    {
      type: "FeatureCollection",
      features: places.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: { kind: p.kind, source: p.source, code: p.code, label: p.icao ?? p.code, name: p.name },
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
