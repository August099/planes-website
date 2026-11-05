// VA-191: METAR y TAF de la Data API de aviationweather.gov (NOAA) en lenguaje claro. Sin dependencias, para
// poder probarlo. Si un dato no se puede interpretar, se muestra el texto original: nunca se adivina.

export type NoaaCloud = { cover?: string | null; base?: number | null };

export type NoaaMetar = {
  icaoId: string;
  name?: string;
  obsTime: number;
  reportTime?: string;
  temp?: number | null;
  dewp?: number | null;
  wdir?: number | string | null;
  wspd?: number | null;
  wgst?: number | null;
  visib?: number | string | null;
  altim?: number | null;
  wxString?: string | null;
  rawOb: string;
  cover?: string | null;
  clouds?: NoaaCloud[];
  fltCat?: string | null;
};

export type NoaaTafForecast = {
  timeFrom: number;
  timeTo: number;
  fcstChange?: string | null;
  probability?: number | null;
  wdir?: number | string | null;
  wspd?: number | null;
  wgst?: number | null;
  visib?: number | string | null;
  wxString?: string | null;
  clouds?: NoaaCloud[];
};

export type NoaaTaf = { icaoId: string; rawTAF: string; issueTime?: string; validTimeFrom: number; validTimeTo: number; fcsts?: NoaaTafForecast[] };

const COVER: Record<string, string> = {
  FEW: "Pocas nubes",
  SCT: "Nubes dispersas",
  BKN: "Nubes fragmentadas",
  OVC: "Cubierto",
  VV: "Cielo no visible",
  NSC: "Sin nubes significativas",
  NCD: "Sin nubes detectadas",
  SKC: "Despejado",
  CLR: "Despejado",
  CAVOK: "CAVOK",
};

export function describeClouds(clouds: NoaaCloud[] | undefined, cover?: string | null): string {
  const layers = (clouds ?? [])
    .filter((c) => c.cover)
    .map((c) => `${COVER[c.cover!] ?? c.cover}${typeof c.base === "number" ? ` a ${c.base.toLocaleString("es-AR")} ft` : ""}`);
  if (layers.length) return layers.join("; ");
  if (cover && COVER[cover]) return COVER[cover];
  return "Sin datos de nubes";
}

/** "VRB", "270" o 270, con velocidad y ráfagas. */
export function describeWind(dir: number | string | null | undefined, speed: number | null | undefined, gust?: number | null): string {
  if (speed === null || speed === undefined) return "Sin datos de viento";
  if (speed === 0) return "Calma";
  const from = dir === "VRB" ? "Variable" : typeof dir === "number" || /^\d+$/.test(String(dir ?? "")) ? `Del ${String(dir).padStart(3, "0")}°` : "Dirección sin dato";
  return `${from} a ${speed} kt${gust ? `, ráfagas de ${gust} kt` : ""}`;
}

/**
 * Visibilidad. La API la da en millas terrestres, pero el METAR argentino la informa en metros: se lee del texto.
 * Sin dato en metros, se convierte desde millas (aproximado).
 */
export function describeVisibility(raw: string | null | undefined, statuteMiles: number | string | null | undefined): string {
  const body = (raw ?? "").split(/\s(?:NOSIG|BECMG|TEMPO|RMK)\b/)[0];
  if (/\bCAVOK\b/.test(body)) return "10 km o más (CAVOK)";
  const meters = body.match(/(?:KT|MPS)\s+(?:\d{3}V\d{3}\s+)?(\d{4})(?:NDV)?\b/);
  if (meters) return meters[1] === "9999" ? "10 km o más" : Number(meters[1]) >= 5000 ? `${Number(meters[1]) / 1000} km` : `${Number(meters[1]).toLocaleString("es-AR")} m`;
  return describeMiles(statuteMiles);
}

export function describeMiles(statuteMiles: number | string | null | undefined): string {
  if (statuteMiles === null || statuteMiles === undefined || statuteMiles === "") return "Sin dato";
  const text = String(statuteMiles);
  if (text.endsWith("+")) return "10 km o más";
  const miles = Number(text);
  return Number.isFinite(miles) ? `Unos ${(miles * 1.609344).toLocaleString("es-AR", { maximumFractionDigits: 1 })} km` : text;
}

const INTENSITY: Record<string, string> = { "-": " ligera", "+": " fuerte" };
const WEATHER: Record<string, string> = {
  DZ: "Llovizna",
  RA: "Lluvia",
  SN: "Nieve",
  SG: "Cinarra",
  GR: "Granizo",
  GS: "Granizo menudo",
  PL: "Hielo granulado",
  BR: "Neblina",
  FG: "Niebla",
  FU: "Humo",
  HZ: "Calima",
  DU: "Polvo",
  SA: "Arena",
  VA: "Ceniza volcánica",
  SQ: "Turbonada",
  FC: "Tornado o tromba",
  SS: "Tempestad de arena",
  DS: "Tempestad de polvo",
  PO: "Remolinos de polvo",
  UP: "Precipitación desconocida",
};
// Calificadores que van después del fenómeno: "Niebla baja", "Lluvia engelante".
const QUALIFIER: Record<string, string> = { FZ: "engelante", MI: "baja", BC: "en bancos", PR: "parcial", DR: "levantada a poca altura", BL: "levantada" };

const lower = (text: string) => (text === "Calima" ? text : text.toLowerCase());

function phenomenon(descriptors: string[], weather: string[]): string {
  const names = weather.map((w) => WEATHER[w]);
  const list = names.map((n, i) => (i ? lower(n) : n)).join(" y ");
  const qualifiers = descriptors.filter((d) => QUALIFIER[d]).map((d) => QUALIFIER[d]);
  const base = [list, ...qualifiers].filter(Boolean).join(" ");
  if (descriptors.includes("TS")) return names.length ? `Tormenta con ${lower(base)}` : "Tormenta";
  if (descriptors.includes("SH")) return names.length ? `Chaparrones de ${lower(base)}` : "Chaparrones";
  return base;
}

/** "-RA" → "Lluvia ligera". Lo que no se reconoce queda tal cual. */
export function describeWeather(text: string | null | undefined): string | null {
  if (!text) return null;
  return text
    .trim()
    .split(/\s+/)
    .map((token) => {
      const m = token.match(/^([-+]?)(VC)?((?:TS|SH|FZ|MI|BC|PR|DR|BL)*)((?:DZ|RA|SN|SG|GR|GS|PL|BR|FG|FU|HZ|DU|SA|VA|SQ|FC|SS|DS|PO|UP)*)$/);
      if (!m || (!m[3] && !m[4])) return token;
      const main = phenomenon(m[3].match(/.{2}/g) ?? [], m[4].match(/.{2}/g) ?? []);
      return `${main}${INTENSITY[m[1]] ?? ""}${m[2] ? " en las cercanías" : ""}`;
    })
    .join("; ");
}

/** Categoría informada por la fuente (criterio FAA). Orientativa: no es la clasificación VMC/IMC reglamentaria. */
export const FLIGHT_CATEGORY: Record<string, { label: string; meaning: string }> = {
  VFR: { label: "VFR", meaning: "Buenas condiciones visuales" },
  MVFR: { label: "MVFR", meaning: "Visuales marginales" },
  IFR: { label: "IFR", meaning: "Condiciones instrumentales" },
  LIFR: { label: "LIFR", meaning: "Instrumentales bajas" },
};

/** Un METAR de más de 3 horas ya no sirve como "actual". */
export const isRecentMetar = (obsTimeSeconds: number, now = Date.now()) => now - obsTimeSeconds * 1000 <= 3 * 3600 * 1000;

export function minutesAgo(obsTimeSeconds: number, now = Date.now()): number {
  return Math.max(0, Math.round((now - obsTimeSeconds * 1000) / 60000));
}

const CHANGE: Record<string, string> = { FM: "Desde", BECMG: "Cambio gradual", TEMPO: "Temporariamente", PROB: "Probabilidad" };

export const describeChange = (change: string | null | undefined, probability?: number | null) => {
  const base = change ? (CHANGE[change] ?? change) : "Inicial";
  return probability ? `${base} ${probability} %` : base;
};

export type NoaaSigmet = {
  icaoId?: string;
  firId?: string | null;
  firName?: string | null;
  validTimeFrom: number;
  validTimeTo: number;
  hazard?: string | null;
  qualifier?: string | null;
  base?: number | null;
  top?: number | null;
  geom?: string | null;
  coords?: { lat: number; lon: number }[] | null;
  rawSigmet: string;
};

const HAZARD: Record<string, string> = { TS: "Tormentas", TURB: "Turbulencia", ICE: "Engelamiento", VA: "Ceniza volcánica", MTW: "Ondas de montaña", TC: "Ciclón tropical", DS: "Tempestad de polvo", SS: "Tempestad de arena", RDOACT: "Nube radiactiva" };
export const describeHazard = (hazard: string | null | undefined) => (hazard ? (HAZARD[hazard] ?? hazard) : "Fenómeno sin clasificar");

/** "Hasta FL150" o "FL100 a FL150". La fuente da pies; un 0 puede ser "sin base informada", así que no se afirma superficie. */
export function describeSigmetLevels(base: number | null | undefined, top: number | null | undefined): string {
  const level = (ft: number) => (ft >= 1000 ? `FL${String(Math.round(ft / 100)).padStart(3, "0")}` : `${ft} ft`);
  if (typeof top !== "number") return "Niveles en el texto original";
  return typeof base === "number" && base > 0 ? `${level(base)} a ${level(top)}` : `Hasta ${level(top)}`;
}

const AREA = { minLat: -60, maxLat: -18, minLng: -80, maxLng: -48 };
const ARGENTINE_FIR = /^SA/;

/** Vigentes ahora, de las FIR argentinas o con algún punto cerca del país. */
export function regionalSigmets(sigmets: NoaaSigmet[], now = Date.now()): NoaaSigmet[] {
  const argentineFirst = (s: NoaaSigmet) => (s.firId && ARGENTINE_FIR.test(s.firId) ? 0 : 1);
  const active = sigmets.filter((s) => {
    if (s.validTimeTo * 1000 <= now || s.validTimeFrom * 1000 > now) return false;
    if (s.firId && ARGENTINE_FIR.test(s.firId)) return true;
    return (s.coords ?? []).some((c) => c.lat >= AREA.minLat && c.lat <= AREA.maxLat && c.lon >= AREA.minLng && c.lon <= AREA.maxLng);
  });
  return active.sort((a, b) => argentineFirst(a) - argentineFirst(b));
}

/** Anillo cerrado para el mapa o null si la geometría no alcanza para un área. */
export function sigmetRing(s: NoaaSigmet): [number, number][] | null {
  const points = (s.coords ?? []).map((c) => [c.lon, c.lat] as [number, number]);
  if (points.length < 3) return null;
  const [first, last] = [points[0], points[points.length - 1]];
  return first[0] === last[0] && first[1] === last[1] ? points : [...points, first];
}

/** Bloques del TAF que rigen en ese instante. Vacío si el TAF no llega hasta ahí. */
export const tafBlocksAt = (taf: NoaaTaf, seconds: number) => (taf.fcsts ?? []).filter((f) => f.timeFrom <= seconds && seconds < f.timeTo);
