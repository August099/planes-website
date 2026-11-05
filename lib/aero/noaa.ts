import "server-only";
import { unstable_cache } from "next/cache";
import type { NoaaMetar, NoaaSigmet, NoaaTaf } from "@/lib/aero/metar";

// VA-191: consultas a aviationweather.gov (NOAA), siempre desde el servidor y con caché: su límite es de 100 pedidos
// por minuto. Un error no se cachea. Si la estación no reporta, la API responde 204.
const API = "https://aviationweather.gov/api/data";
const USER_AGENT = "VentasAeronauticas/1.0 (+https://ventasaeronauticas.com)";

async function noaa<T>(path: string): Promise<T[]> {
  const res = await fetch(`${API}/${path}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (res.status === 204) return [];
  if (!res.ok) throw new Error(`aviationweather respondió ${res.status}`);
  return (await res.json()) as T[];
}

export const cachedMetars = unstable_cache(async (ids: string) => noaa<NoaaMetar>(`metar?ids=${ids}&format=json`), ["aero-metar-v1"], { revalidate: 300 });
export const cachedTaf = unstable_cache(async (id: string) => noaa<NoaaTaf>(`taf?ids=${id}&format=json`), ["aero-taf-v1"], { revalidate: 600 });
export const cachedSigmets = unstable_cache(async () => noaa<NoaaSigmet>("isigmet?format=json"), ["aero-sigmet-v1"], { revalidate: 300 });

/** METAR de muchas estaciones, por tandas. La consulta por zona de la API omite estaciones, por eso se pide por código. */
export const cachedStationMetars = unstable_cache(
  async (ids: string[]) => {
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100));
    const results: NoaaMetar[] = [];
    for (const batch of batches) results.push(...(await noaa<NoaaMetar>(`metar?ids=${batch.join(",")}&format=json`)));
    return results;
  },
  ["aero-station-metars-v1"],
  { revalidate: 300 }
);
