import { canonicalProvince, inArgentineBounds, type AeroRecord } from "@/lib/aero/records";

// VA-191: el MADHEL de ANAC (https://ais.anac.gob.ar/madhel/) se alimenta de esta API. Sin documentar: si cambia
// de forma, la importación falla y sigue la versión anterior. Se consulta poco y solo lo que cambió.
export const MADHEL_API = "https://datos.anac.gob.ar/madhel/api/v2/airports/";

export type MadhelListItem = {
  local_identifier: string;
  human_readable_identifier: string;
  updated_at: string;
  the_geom?: { geometry?: { coordinates?: [number, number] } };
};

type MadhelDetail = {
  type?: string;
  updated_at?: string;
  human_readable_identifier?: string;
  metadata?: {
    identifiers?: { icao?: string | null; iata?: string | null };
    condition?: string | null;
    control?: string | null;
    status?: string | null;
    usage?: string | null;
    traffic?: string | null;
    localization?: {
      city_reference?: string | null;
      state?: string | null;
      distance_reference?: number | null;
      direction_reference?: string | null;
      elevation?: number | null;
      fir?: string | null;
      coordinates?: { lat?: number; lng?: number };
    };
  };
  data?: {
    rwy?: string[];
    fato?: string[];
    tlof?: string[];
    ats?: string[];
    fuel?: string | null;
    human_readable_localization?: string | null;
    helpers_system?: { radio?: string[] };
  };
};

/** "BUENOS AIRES / AEROPARQUE - (AER / SABE) - DRCE - PÚBLICO..." → el nombre. Algunos no traen el código entre paréntesis. */
export function madhelName(full: string): string {
  return full.split(/\s+[-–]\s+\(|\s+\(|\s+[-–]\s+(?:FIR\b|DR[A-Z]{2}\b|P[ÚU]BLICO|PRIVADO|MILITAR)/)[0].trim() || full.trim();
}

/** Condición (público o privado, controlado o no) del texto largo, para los registros que no la traen aparte. */
function conditionFromName(full: string): string | null {
  const m = full.match(/(P[ÚU]BLICO|PRIVADO|MILITAR|ELEVADO)[^[\]]*/i);
  return m ? m[0].trim() : null;
}

const texts = (list: unknown): string[] => (Array.isArray(list) ? list.filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim()) : []);

/** La API remite al AIP en los aeródromos grandes: ese texto no es una ubicación. */
const REFERS_TO_AIP = /Consultar en el sitio web/i;

export function normalizeMadhel(item: MadhelListItem, detail: MadhelDetail | null): { record: AeroRecord; warnings: string[] } {
  const warnings: string[] = [];
  const meta = detail?.metadata;
  const loc = meta?.localization;
  const fullName = detail?.human_readable_identifier ?? item.human_readable_identifier;
  const code = item.local_identifier;

  const fromGeom = item.the_geom?.geometry?.coordinates;
  let lat = loc?.coordinates?.lat ?? fromGeom?.[1] ?? null;
  let lng = loc?.coordinates?.lng ?? fromGeom?.[0] ?? null;
  if (lat === null || lng === null || !inArgentineBounds(lat, lng)) {
    warnings.push(`${code} ${madhelName(fullName)}: coordenadas fuera de rango o faltantes (${lat}, ${lng}). No va al mapa.`);
    lat = lng = null;
  } else {
    lat = Number(lat.toFixed(6));
    lng = Number(lng.toFixed(6));
  }

  const rawLocation = detail?.data?.human_readable_localization?.trim() ?? "";
  const hasLocationText = rawLocation !== "" && !REFERS_TO_AIP.test(rawLocation);
  // Muchos privados traen la elevación solo en el texto: "... - ELEV 44 M 144 FT".
  const elevationM = loc?.elevation ?? Number(rawLocation.match(/ELEV\s+(-?\d+)\s*M/i)?.[1] ?? NaN);
  const location = hasLocationText
    ? rawLocation.replace(/^[\d,.]+[NS]\s+[\d,.]+[EW]\s*-\s*/, "").replace(/\s*-\s*ELEV.*$/i, "").trim()
    : loc?.city_reference
      ? `${loc.distance_reference ? `${loc.distance_reference} km al ${loc.direction_reference ?? ""} de ` : ""}${loc.city_reference}`.replace(/\s+/g, " ")
      : null;
  const province = canonicalProvince(loc?.state ?? rawLocation.match(/Pcia\. de ([^)]+)\)/i)?.[1] ?? null);

  const record: AeroRecord = {
    kind: detail?.type === "HEL" ? "HELIPORT" : "AD",
    code,
    icao: meta?.identifiers?.icao || null,
    iata: meta?.identifiers?.iata || null,
    name: madhelName(fullName).replace(/\uFEFF/g, ""),
    fir: loc?.fir || null,
    province,
    location,
    lat,
    lng,
    elevationM: Number.isFinite(elevationM) ? elevationM : null,
    condition: meta?.condition ?? conditionFromName(fullName),
    runways: [...texts(detail?.data?.rwy), ...texts(detail?.data?.fato), ...texts(detail?.data?.tlof)],
    frequencies: [...texts(detail?.data?.ats), ...texts(detail?.data?.helpers_system?.radio)],
    details: {
      // Los aeródromos del AIP no traen pistas ni frecuencias aquí: la ficha remite al AIP Parte AD.
      seeAip: REFERS_TO_AIP.test(rawLocation),
      control: meta?.control ?? null,
      status: meta?.status ?? null,
      usage: meta?.usage ?? null,
      traffic: meta?.traffic ?? null,
      fuel: detail?.data?.fuel ?? null,
      fullName,
    },
    // Sin detalle no se guarda la fecha: así se vuelve a pedir en la próxima lectura.
    sourceUpdatedAt: detail ? (detail.updated_at ?? item.updated_at ?? null) : null,
  };
  return { record, warnings };
}
