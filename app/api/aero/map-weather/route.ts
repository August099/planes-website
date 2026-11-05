import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";
import { cachedSigmets, cachedStationMetars } from "@/lib/aero/noaa";
import { describeHazard, describeSigmetLevels, isRecentMetar, regionalSigmets, sigmetRing } from "@/lib/aero/metar";

// VA-191: capas de clima del mapa. Una sola respuesta para todo el país, con la caché de NOAA: no depende de cuántos la pidan.
export const dynamic = "force-dynamic";

export type SigmetSummary = { id: string; hazard: string; fir: string; levels: string; from: number; to: number; raw: string };
export type MapWeather = { metars: GeoJSON.FeatureCollection; sigmets: GeoJSON.FeatureCollection; sigmetList: SigmetSummary[] };

export async function GET() {
  if (!flightPlanEnabled()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  try {
    const places = await prisma.aeroPlace.findMany({ where: { icao: { startsWith: "SA" }, lat: { not: null }, lng: { not: null } }, select: { icao: true, source: true, code: true, lat: true, lng: true }, orderBy: { icao: "asc" } });
    const byIcao = new Map(places.map((p) => [p.icao!, p]));
    const [metars, sigmets] = await Promise.all([byIcao.size ? cachedStationMetars([...byIcao.keys()]) : [], cachedSigmets()]);
    const regional = regionalSigmets(sigmets);
    const body: MapWeather = {
      metars: {
        type: "FeatureCollection",
        features: metars
          .filter((m) => isRecentMetar(m.obsTime) && m.fltCat && byIcao.has(m.icaoId))
          .map((m) => {
            const p = byIcao.get(m.icaoId)!;
            return { type: "Feature", geometry: { type: "Point", coordinates: [p.lng!, p.lat!] }, properties: { source: p.source, code: p.code, category: m.fltCat, label: `${m.icaoId} ${m.fltCat}` } };
          }),
      },
      sigmets: {
        type: "FeatureCollection",
        features: regional.flatMap((s) => {
          const ring = sigmetRing(s);
          return ring ? [{ type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [ring] }, properties: { label: describeHazard(s.hazard) } }] : [];
        }),
      },
      sigmetList: regional.map((s, i) => ({ id: `${s.firId ?? "fir"}-${s.validTimeFrom}-${i}`, hazard: describeHazard(s.hazard), fir: s.firName ?? s.firId ?? "FIR sin dato", levels: describeSigmetLevels(s.base, s.top), from: s.validTimeFrom, to: s.validTimeTo, raw: s.rawSigmet })),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("[clima del mapa] no se pudo consultar:", error);
    return NextResponse.json({ error: "El servicio meteorológico no responde" }, { status: 502 });
  }
}
