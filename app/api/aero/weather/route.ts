import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";
import { hitRateLimit, limitKey } from "@/lib/rate-limit";
import { isRecentMetar, type NoaaMetar, type NoaaTaf } from "@/lib/aero/metar";

// VA-191: METAR y TAF de aviationweather.gov, siempre desde el servidor y con caché por estación: el navegador
// nunca llama a la API (su límite es de 100 pedidos por minuto). Si falla, no se cachea el error.
export const dynamic = "force-dynamic";

const API = "https://aviationweather.gov/api/data";
const USER_AGENT = "VentasAeronauticas/1.0 (+https://ventasaeronauticas.com)";
// Solo estaciones argentinas: acota los códigos que se pueden pedir a la API y protege su límite.
const STATION = /^SA[A-Z0-9]{2}$/;

async function noaa<T>(path: string): Promise<T[]> {
  const res = await fetch(`${API}/${path}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (res.status === 204) return []; // La estación no reporta.
  if (!res.ok) throw new Error(`aviationweather respondió ${res.status}`);
  return (await res.json()) as T[];
}

const cachedMetars = unstable_cache(async (ids: string) => noaa<NoaaMetar>(`metar?ids=${ids}&format=json`), ["aero-metar-v1"], { revalidate: 300 });
const cachedTaf = unstable_cache(async (id: string) => noaa<NoaaTaf>(`taf?ids=${id}&format=json`), ["aero-taf-v1"], { revalidate: 600 });

export type WeatherResponse = { station: string; distanceKm?: number; metar: NoaaMetar | null; taf: NoaaTaf | null };

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
};

/** La estación más cercana entre las que reportaron un METAR reciente. */
async function nearestReporting(lat: number, lng: number): Promise<WeatherResponse | null> {
  const places = await prisma.aeroPlace.findMany({ where: { icao: { not: null }, lat: { not: null }, lng: { not: null } }, select: { icao: true, lat: true, lng: true } });
  const nearest = places
    .map((p) => ({ icao: p.icao!, km: haversineKm(lat, lng, p.lat!, p.lng!) }))
    .filter((p) => STATION.test(p.icao))
    .sort((a, b) => a.km - b.km)
    .slice(0, 12);
  if (!nearest.length) return null;
  const metars = await cachedMetars(nearest.map((n) => n.icao).join(","));
  for (const n of nearest) {
    const metar = metars.find((m) => m.icaoId === n.icao && isRecentMetar(m.obsTime));
    if (metar) return { station: n.icao, distanceKm: Math.round(n.km), metar, taf: (await cachedTaf(n.icao))[0] ?? null };
  }
  return null;
}

export async function GET(req: NextRequest) {
  if (!flightPlanEnabled()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const params = req.nextUrl.searchParams;
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip";
    const allowed = await hitRateLimit([{ key: limitKey("aero-weather-ip", ip), limits: [{ max: 30, windowMs: 60_000 }] }]);
    if (!allowed) return NextResponse.json({ error: "Demasiadas consultas. Probá en un minuto." }, { status: 429 });
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    if (params.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      const found = await nearestReporting(lat, lng);
      return NextResponse.json(found ?? { error: "No hay estaciones cercanas con datos recientes" }, { status: found ? 200 : 404 });
    }
    const station = (params.get("station") ?? "").toUpperCase();
    if (!STATION.test(station)) return NextResponse.json({ error: "Código OACI inválido" }, { status: 400 });
    const [metars, tafs] = await Promise.all([cachedMetars(station), cachedTaf(station)]);
    const body: WeatherResponse = { station, metar: metars[0] ?? null, taf: tafs[0] ?? null };
    return NextResponse.json(body);
  } catch (error) {
    console.error("[clima] no se pudo consultar:", error);
    return NextResponse.json({ error: "El servicio meteorológico no responde" }, { status: 502 });
  }
}
