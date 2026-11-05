// VA-191: formulario OACI (casillas 7 a 19) y mensaje FPL. Puro y con tests. Formato según PANS-ATM (Doc 4444), apéndice 2.
// El mensaje FPL lleva las casillas 7 a 18: la 19 queda en el formulario, como indica el documento.
import type { RoutePoint } from "@/lib/aero/route";

export type PlanDraft = {
  v: 1;
  aircraft: {
    registration: string;
    typeCode: string; // Designador OACI, o vacío si no tiene y se usa typeText.
    typeText: string;
    wake: "" | "L" | "M" | "H" | "J";
    cruiseKt: string;
    fuelPerHour: string;
    fuelUnit: "L" | "GAL" | "KG";
    color: string;
    equipment: string[];
    surveillance: string[];
    pbn: string;
  };
  route: { origin: RoutePoint | null; destination: RoutePoint | null; alternate: RoutePoint | null; waypoints: RoutePoint[]; winds: { dir: string; speed: string }[] };
  flight: {
    date: string; // AAAA-MM-DD, hora argentina.
    time: string; // HH:MM, hora argentina.
    rules: "" | "V" | "I" | "Y" | "Z";
    type: "" | "G" | "N" | "S" | "M" | "X";
    levelKind: "VFR" | "A" | "F";
    level: string; // Centenas de pies: 045.
    persons: string;
    endurance: string; // HH:MM.
    pilot: string;
    taxiFuel: string;
    reserveMinutes: string;
    fuelOnBoard: string;
    radios: string[];
    survival: string[];
    jackets: string[];
    remarks18: string;
    remarks19: string;
    routeOverride: string;
  };
};

export const emptyDraft = (): PlanDraft => ({
  v: 1,
  aircraft: { registration: "", typeCode: "", typeText: "", wake: "", cruiseKt: "", fuelPerHour: "", fuelUnit: "L", color: "", equipment: [], surveillance: [], pbn: "" },
  route: { origin: null, destination: null, alternate: null, waypoints: [], winds: [] },
  flight: { date: "", time: "", rules: "", type: "", levelKind: "VFR", level: "", persons: "", endurance: "", pilot: "", taxiFuel: "", reserveMinutes: "", fuelOnBoard: "", radios: [], survival: [], jackets: [], remarks18: "", remarks19: "", routeOverride: "" },
});

/** "LV-ABC" → "LVABC". Casilla 7: hasta 7 caracteres, sin guiones. */
export const aircraftIdent = (registration: string) => registration.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Coordenadas en casilla 15 y 18: "3433S05825W". Redondea al minuto sin dejar 60 minutos. */
export function icaoCoordinates(lat: number, lng: number): string {
  const part = (value: number, degDigits: number) => {
    const abs = Math.abs(value);
    let deg = Math.floor(abs);
    let min = Math.round((abs - deg) * 60);
    if (min === 60) {
      deg += 1;
      min = 0;
    }
    return `${String(deg).padStart(degDigits, "0")}${String(min).padStart(2, "0")}`;
  };
  return `${part(lat, 2)}${lat < 0 ? "S" : "N"}${part(lng, 3)}${lng < 0 ? "W" : "E"}`;
}

/** Hora argentina (UTC-3, sin horario de verano) a instante. Null si falta o no es válida. */
export function localToUtc(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const hhmmUtc = (d: Date) => `${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}`;
const dofUtc = (d: Date) => `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

/** Duración en horas a HHMM, redondeando al minuto. */
export function hoursToHhmm(hours: number): string {
  const total = Math.round(hours * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}`;
}

/** "03:30" → "0330". Null si no es una duración válida. */
export function enduranceHhmm(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2}):?([0-5]\d)$/);
  return m ? `${m[1].padStart(2, "0")}${m[2]}` : null;
}

const ICAO_CODE = /^[A-Z]{4}$/;
const usableIcao = (p: RoutePoint | null) => (p?.icao && ICAO_CODE.test(p.icao) ? p.icao : null);
/** Texto libre sin los caracteres que el mensaje no admite: "/", "-", "(" y ")" tienen significado propio. */
const cleanText = (text: string) => text.toUpperCase().normalize("NFD").replace(/[̀-ͯ﻿]/g, "").replace(/[()\-/]/g, " ").replace(/\s+/g, " ").trim();
const placeRef = (p: RoutePoint) => `${cleanText(p.name)} ${icaoCoordinates(p.lat, p.lng)}`;

export type FplItems = {
  item7: string;
  item8Rules: string;
  item8Type: string;
  item9Type: string;
  item9Wake: string;
  item10a: string;
  item10b: string;
  item13Dep: string;
  item13Time: string;
  item15Speed: string;
  item15Level: string;
  item15Route: string;
  item16Dest: string;
  item16Eet: string;
  item16Altn: string;
  item18: string;
  item19: { endurance: string; persons: string; radios: string; survival: string; jackets: string; color: string; remarks: string; pilot: string };
};

export function buildItems(draft: PlanDraft, totalHours: number | null): FplItems {
  const { aircraft, route, flight } = draft;
  const departure = localToUtc(flight.date, flight.time);
  const type = aircraft.typeCode.toUpperCase().trim();
  const kt = Number(aircraft.cruiseKt);

  const level = flight.levelKind === "VFR" ? "VFR" : flight.level.trim() ? `${flight.levelKind}${flight.level.trim().padStart(3, "0")}` : "";
  const via = route.waypoints.flatMap((w) => [icaoCoordinates(w.lat, w.lng), "DCT"]);
  const autoRoute = ["DCT", ...via].join(" ");

  const fields18: string[] = [];
  if (aircraft.pbn.trim()) fields18.push(`PBN/${aircraft.pbn.trim().toUpperCase()}`);
  if (route.origin && !usableIcao(route.origin)) fields18.push(`DEP/${placeRef(route.origin)}`);
  if (route.destination && !usableIcao(route.destination)) fields18.push(`DEST/${placeRef(route.destination)}`);
  if (departure) fields18.push(`DOF/${dofUtc(departure)}`);
  if (!type && aircraft.typeText.trim()) fields18.push(`TYP/${cleanText(aircraft.typeText)}`);
  if (route.alternate && !usableIcao(route.alternate)) fields18.push(`ALTN/${placeRef(route.alternate)}`);
  if (flight.remarks18.trim()) fields18.push(`RMK/${cleanText(flight.remarks18)}`);

  return {
    item7: aircraftIdent(aircraft.registration),
    item8Rules: flight.rules,
    item8Type: flight.type,
    item9Type: type || (aircraft.typeText.trim() ? "ZZZZ" : ""),
    item9Wake: aircraft.wake,
    item10a: aircraft.equipment.join(""),
    item10b: aircraft.surveillance.join(""),
    item13Dep: route.origin ? (usableIcao(route.origin) ?? "ZZZZ") : "",
    item13Time: departure ? hhmmUtc(departure) : "",
    item15Speed: Number.isFinite(kt) && kt > 0 ? `N${String(Math.round(kt)).padStart(4, "0")}` : "",
    item15Level: level,
    item15Route: flight.routeOverride.trim().toUpperCase() || autoRoute,
    item16Dest: route.destination ? (usableIcao(route.destination) ?? "ZZZZ") : "",
    item16Eet: totalHours !== null ? hoursToHhmm(totalHours) : "",
    item16Altn: route.alternate ? (usableIcao(route.alternate) ?? "ZZZZ") : "",
    item18: fields18.length ? fields18.join(" ") : "0",
    item19: {
      endurance: enduranceHhmm(flight.endurance) ?? "",
      persons: /^\d+$/.test(flight.persons.trim()) ? flight.persons.trim().padStart(3, "0") : flight.persons.trim().toUpperCase() === "TBN" ? "TBN" : "",
      radios: flight.radios.join(" "),
      survival: flight.survival.join(" "),
      jackets: flight.jackets.join(" "),
      color: cleanText(aircraft.color),
      remarks: cleanText(flight.remarks19),
      pilot: cleanText(flight.pilot),
    },
  };
}

export type MissingField = { item: string; label: string };

/** Lo que falta para que el plan sea presentable, en orden de casilla. */
export function missingFields(i: FplItems): MissingField[] {
  const out: MissingField[] = [];
  const need = (ok: unknown, item: string, label: string) => {
    if (!ok) out.push({ item, label });
  };
  need(i.item7.length >= 2 && i.item7.length <= 7, "7", "Matrícula, de 2 a 7 caracteres sin guiones");
  need(i.item8Rules, "8", "Reglas de vuelo");
  need(i.item8Type, "8", "Tipo de vuelo");
  need(i.item9Type, "9", "Tipo de aeronave");
  need(i.item9Wake, "9", "Categoría de estela");
  need(i.item10a, "10", "Equipo de comunicación y navegación");
  need(i.item10b, "10", "Equipo de vigilancia");
  need(i.item13Dep, "13", "Aeródromo de salida");
  need(i.item13Time, "13", "Fecha y hora de salida");
  need(i.item15Speed, "15", "Velocidad de crucero");
  need(i.item15Level, "15", "Altitud o nivel");
  need(i.item15Route, "15", "Ruta");
  need(i.item16Dest, "16", "Aeródromo de destino");
  need(i.item16Eet, "16", "Duración total estimada");
  need(i.item19.endurance, "19", "Autonomía");
  need(i.item19.persons, "19", "Personas a bordo");
  need(i.item19.color, "19", "Color y marcas");
  need(i.item19.pilot, "19", "Piloto al mando");
  if (i.item10a.includes("R") && !i.item18.includes("PBN/")) out.push({ item: "18", label: "Con equipo PBN hay que indicar PBN/ en la casilla 18" });
  return out;
}

/** Mensaje en texto OACI. Las casillas sin dato quedan vacías, y missingFields las señala. */
export function fplMessage(i: FplItems): string {
  const altn = i.item16Altn ? ` ${i.item16Altn}` : "";
  return [
    `(FPL-${i.item7}-${i.item8Rules}${i.item8Type}`,
    `-${i.item9Type}/${i.item9Wake}-${i.item10a}/${i.item10b}`,
    `-${i.item13Dep}${i.item13Time}`,
    `-${i.item15Speed}${i.item15Level} ${i.item15Route}`,
    `-${i.item16Dest}${i.item16Eet}${altn}`,
    `-${i.item18})`,
  ].join("\n");
}

/** Equipo, en lenguaje simple. El código OACI se arma solo. */
export const EQUIPMENT = [
  { code: "S", label: "Equipo estándar: VHF, VOR e ILS" },
  { code: "G", label: "GPS (GNSS)" },
  { code: "D", label: "DME" },
  { code: "O", label: "VOR" },
  { code: "L", label: "ILS" },
  { code: "F", label: "ADF" },
  { code: "V", label: "Radio VHF" },
  { code: "U", label: "Radio UHF" },
  { code: "H", label: "Radio HF" },
  { code: "Y", label: "VHF con separación de 8,33 kHz" },
  { code: "R", label: "Aprobación PBN (se indica en la casilla 18)" },
  { code: "N", label: "Sin equipo de comunicación ni navegación, o no funciona" },
] as const;

export const SURVEILLANCE = [
  { code: "N", label: "Sin transpondedor" },
  { code: "A", label: "Transpondedor modo A" },
  { code: "C", label: "Transpondedor modo A y C (con altitud)" },
  { code: "S", label: "Transpondedor modo S" },
  { code: "E", label: "Modo S con ADS-B saliente" },
  { code: "B1", label: "ADS-B saliente en 1090 MHz" },
] as const;

export const RADIOS = [
  { code: "U", label: "UHF 243 MHz" },
  { code: "V", label: "VHF 121,5 MHz" },
  { code: "E", label: "Baliza ELT" },
] as const;

export const SURVIVAL = [
  { code: "P", label: "Polar" },
  { code: "D", label: "Desierto" },
  { code: "M", label: "Marítimo" },
  { code: "J", label: "Selva" },
] as const;

export const JACKETS = [
  { code: "L", label: "Con luz" },
  { code: "F", label: "Con fluoresceína" },
  { code: "U", label: "Con radio UHF" },
  { code: "V", label: "Con radio VHF" },
] as const;

export const FLIGHT_TYPES = [
  { code: "G", label: "Aviación general" },
  { code: "N", label: "Transporte no regular" },
  { code: "S", label: "Transporte regular" },
  { code: "M", label: "Militar" },
  { code: "X", label: "Otro" },
] as const;

export const FLIGHT_RULES = [
  { code: "V", label: "VFR" },
  { code: "I", label: "IFR" },
  { code: "Y", label: "IFR y después VFR" },
  { code: "Z", label: "VFR y después IFR" },
] as const;

/** Designadores habituales (OACI Doc 8643). Todos de estela L. Para el resto, se escribe el código o el tipo en texto. */
export const AIRCRAFT_TYPES = [
  ["C150", "Cessna 150"], ["C152", "Cessna 152"], ["C170", "Cessna 170"], ["C172", "Cessna 172"], ["C177", "Cessna 177 Cardinal"], ["C180", "Cessna 180"], ["C182", "Cessna 182"], ["C185", "Cessna 185"], ["C206", "Cessna 206"], ["C207", "Cessna 207"], ["C208", "Cessna 208 Caravan"], ["C210", "Cessna 210"], ["C310", "Cessna 310"], ["C337", "Cessna 337"], ["C340", "Cessna 340"], ["C402", "Cessna 402"], ["C414", "Cessna 414"],
  ["J3", "Piper J-3 Cub"], ["PA11", "Piper PA-11 Cub Special"], ["PA18", "Piper PA-18 Super Cub"], ["PA25", "Piper PA-25 Pawnee"], ["P28A", "Piper PA-28 Cherokee, Archer, Warrior"], ["P28R", "Piper PA-28R Arrow"], ["PA32", "Piper PA-32 Cherokee Six"], ["P32R", "Piper PA-32R Saratoga, Lance"], ["PA34", "Piper PA-34 Seneca"], ["PA44", "Piper PA-44 Seminole"], ["PA46", "Piper PA-46 Malibu"], ["PA31", "Piper PA-31 Navajo"],
  ["BE33", "Beechcraft 33 Bonanza"], ["BE35", "Beechcraft 35 Bonanza"], ["BE36", "Beechcraft 36 Bonanza"], ["BE55", "Beechcraft 55 Baron"], ["BE58", "Beechcraft 58 Baron"], ["BE9L", "Beechcraft King Air 90"], ["BE20", "Beechcraft King Air 200"], ["B350", "Beechcraft King Air 350"],
  ["M20P", "Mooney M20"], ["SR20", "Cirrus SR20"], ["SR22", "Cirrus SR22"], ["DA20", "Diamond DA20"], ["DA40", "Diamond DA40"], ["DA42", "Diamond DA42"], ["P92", "Tecnam P92"],
  ["R22", "Robinson R22"], ["R44", "Robinson R44"], ["R66", "Robinson R66"], ["B06", "Bell 206"], ["B407", "Bell 407"], ["AS50", "Airbus H125, AS350"],
].map(([code, name]) => ({ code, name, wake: "L" as const }));
