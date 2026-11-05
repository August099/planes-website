import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";
import { hitRateLimit, limitKey } from "@/lib/rate-limit";
import { cachedMetars, cachedTaf } from "@/lib/aero/noaa";
import { isRecentMetar } from "@/lib/aero/metar";
import { buildItems, fplMessage, hoursToHhmm } from "@/lib/aero/fpl";
import { draftLegs, planSchema } from "@/lib/aero/plan-schema";
import { planFuel, planWarnings } from "@/lib/aero/plan-summary";
import { sunAtArrival, totalDistanceNm } from "@/lib/aero/route";
import { FlightPlanPDF, type StationWeather } from "@/components/pdf/FlightPlanPDF";

// VA-191: PDF del plan, sin cuenta. Rehace todos los cálculos en el servidor: no confía en los que manda el navegador.
const MAX_BODY = 64_000;
const STATION = /^SA[A-Z0-9]{2}$/;
const AR = "America/Argentina/Buenos_Aires";
const stamp = (d: Date) => d.toLocaleString("es-AR", { timeZone: AR, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export async function POST(req: NextRequest) {
  if (!flightPlanEnabled()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip";
  if (!(await hitRateLimit([{ key: limitKey("flight-plan-pdf-ip", ip), limits: [{ max: 20, windowMs: 3_600_000 }] }]))) return NextResponse.json({ error: "Demasiados PDF. Probá en un rato." }, { status: 429 });
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "Plan demasiado largo" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }
  const parsed = planSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

  const draft = parsed.data;
  const { legs, hours, when } = draftLegs(draft);
  const items = buildItems(draft, hours);
  const stations = [
    { label: "Salida", point: draft.route.origin },
    { label: "Destino", point: draft.route.destination },
    { label: "Alternativa", point: draft.route.alternate },
  ].filter((s) => s.point?.icao && STATION.test(s.point.icao));

  // Si el clima no responde, el PDF sale igual: el plan no depende de eso.
  const weather: StationWeather[] = await Promise.all(
    stations.map(async ({ label, point }) => {
      const station = point!.icao!;
      try {
        const [metars, tafs] = await Promise.all([cachedMetars(station), cachedTaf(station)]);
        const metar = metars[0] && isRecentMetar(metars[0].obsTime) ? metars[0].rawOb : null;
        return { station, label, metar, taf: tafs[0]?.rawTAF ?? null };
      } catch {
        return { station, label, metar: null, taf: null };
      }
    })
  );

  const destination = draft.route.destination;
  const arrival = hours !== null && destination ? new Date(when.getTime() + hours * 3600_000) : null;
  const sun = arrival && destination ? sunAtArrival(arrival, destination.lat, destination.lng) : null;
  const blob = await pdf(
    <FlightPlanPDF
      items={items}
      message={fplMessage(items)}
      localDeparture={draft.flight.date && draft.flight.time ? `${draft.flight.date.split("-").reverse().join("/")} ${draft.flight.time}` : ""}
      legs={legs}
      totals={{ distanceNm: totalDistanceNm(legs), time: hours !== null ? `${hoursToHhmm(hours).slice(0, 2)}:${hoursToHhmm(hours).slice(2)} h` : null }}
      fuel={planFuel(draft, hours)?.lines ?? []}
      warnings={planWarnings(draft, hours, sun)}
      weather={weather}
      generatedAt={stamp(new Date())}
    />
  ).toBlob();
  const buffer = await blob.arrayBuffer();
  const name = items.item7 || "plan";
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="plan-de-vuelo-${name}.pdf"`, "Cache-Control": "private, no-store" } });
}
