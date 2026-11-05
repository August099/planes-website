"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAircraftProfileAction, deleteFlightPlanAction, saveAircraftProfileAction, saveFlightPlanAction } from "@/app/actions/flight-plan-actions";
import { aircraftSchema, draftLegs, planSchema, routePoints } from "@/lib/aero/plan-schema";
import { AIRCRAFT_TYPES, EQUIPMENT, FLIGHT_RULES, FLIGHT_TYPES, JACKETS, RADIOS, SURVEILLANCE, SURVIVAL, buildItems, emptyDraft, fplMessage, localToUtc, missingFields, type FplItems, type PlanDraft } from "@/lib/aero/fpl";
import { totalDistanceNm, type RoutePoint } from "@/lib/aero/route";
import { PlacePicker } from "@/components/flight-plan/PlacePicker";
import { Briefing } from "@/components/flight-plan/planner/Briefing";
import { LegList } from "@/components/flight-plan/planner/LegList";
import { RouteMap } from "@/components/flight-plan/planner/RouteMap";
import { CheckGroup, Field, PointField, Select, toRoutePoint } from "@/components/flight-plan/planner/fields";

// VA-191: plan de vuelo guiado en 5 pasos. Lo que se carga queda en el navegador, y se guarda en la cuenta solo si se pide.
const DRAFT_KEY = "va_fp_draft";
const STEPS = ["Aeronave", "Ruta", "Vuelo", "Briefing", "Resultado"] as const;

export type SavedPlan = { id: string; name: string; origin: string | null; destination: string | null; departureAt: string | null; data: unknown };
export type SavedProfile = { id: string; name: string; data: unknown };
export type PlannerProps = { userName: string | null; signedIn: boolean; plans: SavedPlan[]; profiles: SavedProfile[]; limit: number | null; used: number; dataNote: string };

const WAKE_OPTIONS = [
  { value: "", label: "Elegí" },
  { value: "L", label: "Liviana (L), hasta 7.000 kg" },
  { value: "M", label: "Media (M)" },
  { value: "H", label: "Pesada (H)" },
  { value: "J", label: "Súper (J)" },
] as const;
const withEmpty = <T extends string>(list: readonly { code: T; label: string }[]) => [{ value: "" as const, label: "Elegí" }, ...list.map((o) => ({ value: o.code, label: o.label }))];

function loadDraft(pilot: string | null): PlanDraft {
  try {
    const parsed = planSchema.safeParse(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null"));
    if (parsed.success) return parsed.data;
  } catch {
    // Sin almacenamiento o con datos viejos, se empieza de cero.
  }
  const draft = emptyDraft();
  if (pilot) draft.flight.pilot = pilot;
  return draft;
}

function TypePicker({ draft, setAircraft, missing }: { draft: PlanDraft; setAircraft: (patch: Partial<PlanDraft["aircraft"]>) => void; missing: boolean }) {
  const code = draft.aircraft.typeCode;
  const query = code.trim().toLowerCase();
  const matches = useMemo(() => (query.length < 2 ? [] : AIRCRAFT_TYPES.filter((t) => t.code.toLowerCase().includes(query) || t.name.toLowerCase().includes(query)).slice(0, 6)), [query]);
  const exact = AIRCRAFT_TYPES.find((t) => t.code === code);
  return (
    <div className="relative min-w-0">
      <Field label="Tipo de aeronave" value={code} onChange={(v) => setAircraft({ typeCode: v.trim().slice(0, 4).toUpperCase() })} placeholder="Cessna 182 o C182" missing={missing} hint={exact ? exact.name : "Escribí el modelo y elegí el designador OACI."} />
      {matches.length > 0 && !exact && (
        <ul className="absolute inset-x-0 z-30 mt-1 rounded-md border border-[#00205B]/15 bg-white shadow-lg">
          {matches.map((t) => (
            <li key={t.code}>
              <button type="button" onClick={() => setAircraft({ typeCode: t.code, wake: t.wake, typeText: "" })} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <span className="text-[#00205B]">{t.name}</span>
                <span className="font-semibold tabular-nums text-[#00205B]">{t.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AircraftForm({ draft, setAircraft, items, showMissing }: { draft: PlanDraft; setAircraft: (patch: Partial<PlanDraft["aircraft"]>) => void; items: FplItems; showMissing: boolean }) {
  const a = draft.aircraft;
  const num = (text: string) => text.replace(/[^\d.,]/g, "");
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Matrícula" value={a.registration} onChange={(v) => setAircraft({ registration: v })} placeholder="LV-ABC" uppercase maxLength={10} missing={showMissing && (items.item7.length < 2 || items.item7.length > 7)} />
        <TypePicker draft={draft} setAircraft={setAircraft} missing={showMissing && !items.item9Type} />
        {!a.typeCode && <Field label="Si no tiene designador, el tipo en texto" value={a.typeText} onChange={(v) => setAircraft({ typeText: v })} placeholder="Experimental RV-7" hint="Va en la casilla 18 como TYP/, con ZZZZ en la 9." />}
        <Select label="Categoría de estela" value={a.wake} onChange={(wake) => setAircraft({ wake })} options={WAKE_OPTIONS} missing={showMissing && !a.wake} />
        <Field label="Velocidad de crucero (TAS)" value={a.cruiseKt} onChange={(v) => setAircraft({ cruiseKt: num(v) })} inputMode="decimal" placeholder="120" hint="En nudos" missing={showMissing && !items.item15Speed} />
        <Field label="Color y marcas" value={a.color} onChange={(v) => setAircraft({ color: v })} placeholder="Blanco con franja roja" missing={showMissing && !items.item19.color} />
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
          <Field label="Consumo por hora" value={a.fuelPerHour} onChange={(v) => setAircraft({ fuelPerHour: num(v) })} inputMode="decimal" placeholder="40" />
          <Select label="Unidad" value={a.fuelUnit} onChange={(fuelUnit) => setAircraft({ fuelUnit })} options={[{ value: "L", label: "Litros" }, { value: "GAL", label: "Galones" }, { value: "KG", label: "Kilos" }]} />
        </div>
      </div>
      <CheckGroup legend="Comunicación y navegación a bordo" value={a.equipment} onChange={(equipment) => setAircraft({ equipment })} options={EQUIPMENT} exclusive="N" missing={showMissing && !items.item10a} />
      <CheckGroup legend="Transpondedor" value={a.surveillance} onChange={(surveillance) => setAircraft({ surveillance })} options={SURVEILLANCE} exclusive="N" missing={showMissing && !items.item10b} />
      {a.equipment.includes("R") && <Field label="Capacidades PBN" value={a.pbn} onChange={(v) => setAircraft({ pbn: v.toUpperCase() })} placeholder="B2C2D2" hint="Tal como figuran en la aprobación de la aeronave." />}
    </div>
  );
}

function FlightForm({ draft, setFlight, items, showMissing }: { draft: PlanDraft; setFlight: (patch: Partial<PlanDraft["flight"]>) => void; items: FplItems; showMissing: boolean }) {
  const f = draft.flight;
  const num = (text: string) => text.replace(/[^\d.,]/g, "");
  const utc = localToUtc(f.date, f.time);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha de salida" type="date" value={f.date} onChange={(date) => setFlight({ date })} missing={showMissing && !items.item13Time} />
        <Field label="Hora de salida, hora argentina" type="time" value={f.time} onChange={(time) => setFlight({ time })} missing={showMissing && !items.item13Time} hint={utc ? `En UTC: ${utc.toLocaleString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}` : "Se convierte a UTC sola."} />
        <Select label="Reglas de vuelo" value={f.rules} onChange={(rules) => setFlight({ rules })} options={withEmpty(FLIGHT_RULES)} missing={showMissing && !f.rules} />
        <Select label="Tipo de vuelo" value={f.type} onChange={(type) => setFlight({ type })} options={withEmpty(FLIGHT_TYPES)} missing={showMissing && !f.type} />
        <Select label="Altitud o nivel" value={f.levelKind} onChange={(levelKind) => setFlight({ levelKind })} options={[{ value: "VFR", label: "VFR, sin nivel fijo" }, { value: "A", label: "Altitud (A), centenas de pies" }, { value: "F", label: "Nivel de vuelo (F)" }]} />
        {f.levelKind !== "VFR" && <Field label={f.levelKind === "A" ? "Altitud, centenas de pies" : "Nivel de vuelo"} value={f.level} onChange={(v) => setFlight({ level: v.replace(/\D/g, "").slice(0, 3) })} inputMode="numeric" placeholder="045" missing={showMissing && !items.item15Level} />}
        <Field label="Personas a bordo" value={f.persons} onChange={(persons) => setFlight({ persons: persons.toUpperCase().slice(0, 3) })} inputMode="numeric" placeholder="2" missing={showMissing && !items.item19.persons} />
        <Field label="Autonomía" value={f.endurance} onChange={(endurance) => setFlight({ endurance })} placeholder="4:30" hint="Horas y minutos" missing={showMissing && !items.item19.endurance} />
        <Field label="Piloto al mando" value={f.pilot} onChange={(pilot) => setFlight({ pilot })} missing={showMissing && !items.item19.pilot} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Combustible a bordo" value={f.fuelOnBoard} onChange={(v) => setFlight({ fuelOnBoard: num(v) })} inputMode="decimal" hint="En la unidad del consumo" />
        <Field label="Combustible de rodaje" value={f.taxiFuel} onChange={(v) => setFlight({ taxiFuel: num(v) })} inputMode="decimal" />
        <Field label="Reserva, en minutos" value={f.reserveMinutes} onChange={(v) => setFlight({ reserveMinutes: v.replace(/\D/g, "") })} inputMode="numeric" hint="La definís vos, según la norma que aplique." />
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-[#00205B]">Equipo de emergencia y observaciones</summary>
        <div className="mt-2 space-y-4">
          <CheckGroup legend="Radio de emergencia" value={f.radios} onChange={(radios) => setFlight({ radios })} options={RADIOS} />
          <CheckGroup legend="Equipo de supervivencia" value={f.survival} onChange={(survival) => setFlight({ survival })} options={SURVIVAL} />
          <CheckGroup legend="Chalecos salvavidas" value={f.jackets} onChange={(jackets) => setFlight({ jackets })} options={JACKETS} />
          <Field label="Observaciones (casilla 18, RMK/)" value={f.remarks18} onChange={(remarks18) => setFlight({ remarks18 })} />
          <Field label="Observaciones (casilla 19, N/)" value={f.remarks19} onChange={(remarks19) => setFlight({ remarks19 })} />
        </div>
      </details>
    </div>
  );
}

function ResultStep({ draft, setAircraft, setFlight, hours, signedIn, loaded, onSaved, limitReached }: { draft: PlanDraft; setAircraft: (p: Partial<PlanDraft["aircraft"]>) => void; setFlight: (p: Partial<PlanDraft["flight"]>) => void; hours: number | null; signedIn: boolean; loaded: { id: string; name: string } | null; onSaved: (plan: { id: string; name: string }) => void; limitReached: boolean }) {
  const items = useMemo(() => buildItems(draft, hours), [draft, hours]);
  const missing = useMemo(() => missingFields(items), [items]);
  const message = useMemo(() => fplMessage(items), [items]);
  const [copied, setCopied] = useState(false);
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "failed">("idle");
  const [name, setName] = useState(loaded?.name ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const downloadPdf = async () => {
    setPdfState("loading");
    try {
      const res = await fetch("/api/flight-plan/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `plan-de-vuelo-${items.item7 || "borrador"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setPdfState("idle");
    } catch {
      setPdfState("failed");
    }
  };

  const save = () => {
    setNotice(null);
    startTransition(async () => {
      const fallback = `${draft.route.origin?.icao ?? draft.route.origin?.code ?? "Plan"} a ${draft.route.destination?.icao ?? draft.route.destination?.code ?? "destino"}`;
      const finalName = name.trim() || fallback;
      const result = await saveFlightPlanAction({ id: loaded?.id, name: finalName, draft });
      if (result.ok) {
        onSaved({ id: result.id, name: finalName });
        setNotice("Plan guardado.");
      } else setNotice(result.error);
    });
  };

  const miss = (item: string, label?: string) => missing.some((m) => m.item === item && (!label || m.label === label));
  const button = "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-[#00205B]/25 bg-white px-4 text-sm font-bold text-[#00205B] hover:bg-slate-50 disabled:opacity-60";

  return (
    <div className="space-y-8">
      {missing.length > 0 ? (
        <section aria-labelledby="fp-missing" className="border-l-2 border-[#D62828] pl-3">
          <h3 id="fp-missing" className="text-sm font-bold text-[#00205B]">Falta completar</h3>
          <ul className="mt-1 text-sm text-slate-700">
            {missing.map((m) => (
              <li key={`${m.item}-${m.label}`}>
                <span className="font-semibold tabular-nums">Casilla {m.item}:</span> {m.label}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="border-l-2 border-[#00205B] pl-3 text-sm font-semibold text-[#00205B]">El formulario está completo. Revisalo antes de presentarlo.</p>
      )}

      <section aria-labelledby="fp-form" className="space-y-6">
        <h3 id="fp-form" className="font-heading text-base font-bold text-[#00205B]">Formulario OACI, casillas 7 a 19</h3>
        <AircraftForm draft={draft} setAircraft={setAircraft} items={items} showMissing />
        <FlightForm draft={draft} setFlight={setFlight} items={items} showMissing />
        <dl className="grid gap-x-6 gap-y-2 rounded-lg border border-[#00205B]/12 bg-white p-4 text-sm sm:grid-cols-2">
          {[
            ["13 Salida", `${items.item13Dep || "falta"} ${items.item13Time}`],
            ["15 Crucero y nivel", `${items.item15Speed} ${items.item15Level}`],
            ["16 Destino y duración", `${items.item16Dest || "falta"} ${items.item16Eet}`],
            ["16 Alternativa", items.item16Altn || "Sin alternativa"],
            ["18 Otros datos", items.item18],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-slate-600">{label}</dt>
              <dd className="break-words font-semibold tabular-nums text-[#00205B]">{value}</dd>
            </div>
          ))}
        </dl>
        <Field label="15 Ruta" value={draft.flight.routeOverride || items.item15Route} onChange={(routeOverride) => setFlight({ routeOverride })} uppercase missing={miss("15", "Ruta")} hint="Se arma sola con los puntos del paso Ruta. Si la editás, queda tu versión." />
        {draft.flight.routeOverride && (
          <button type="button" onClick={() => setFlight({ routeOverride: "" })} className="min-h-11 cursor-pointer text-sm font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]">
            Volver a la ruta automática
          </button>
        )}
      </section>

      <section aria-labelledby="fp-message">
        <h3 id="fp-message" className="font-heading text-base font-bold text-[#00205B]">Mensaje FPL</h3>
        <p className="mt-1 text-xs text-slate-500">Casillas 7 a 18, en texto OACI. La casilla 19 va solo en el formulario.</p>
        <pre className="mt-2 overflow-x-auto rounded-md border border-[#00205B]/12 bg-white p-3 font-mono text-sm text-[#00205B]">{message}</pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={copy} className={button}>
            {copied ? "Copiado" : "Copiar mensaje"}
          </button>
          <button type="button" onClick={downloadPdf} disabled={pdfState === "loading"} className={button}>
            {pdfState === "loading" ? "Armando el PDF…" : "Descargar PDF"}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={button}>
            Compartir por WhatsApp
          </a>
        </div>
        {pdfState === "failed" && <p role="status" className="mt-2 text-sm text-slate-700">No se pudo armar el PDF. Probá de nuevo en un momento.</p>}
        <p className="mt-2 text-xs text-slate-500">Este plan no se envía a ninguna autoridad: presentarlo es responsabilidad del piloto. Confirmá el formato con la oficina ARO-AIS.</p>
      </section>

      <section aria-labelledby="fp-save">
        <h3 id="fp-save" className="font-heading text-base font-bold text-[#00205B]">Guardar</h3>
        {signedIn ? (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <Field label="Nombre del plan" value={name} onChange={setName} placeholder="SABE a SACO" maxLength={80} />
            </div>
            <button type="button" onClick={save} disabled={pending || (!loaded && limitReached)} className="inline-flex min-h-11 cursor-pointer items-center rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#00307F] disabled:opacity-60">
              {pending ? "Guardando…" : loaded ? "Guardar cambios" : "Guardar plan"}
            </button>
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-700">
            <Link href="/login" className="font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]">Ingresá a tu cuenta</Link> para guardarlo. Lo que cargaste sigue acá cuando vuelvas.
          </p>
        )}
        {!loaded && limitReached && signedIn && (
          <p className="mt-2 text-sm text-slate-700">
            Llegaste al límite de tu plan. Borrá algo guardado o <Link href="/plans" className="font-semibold underline underline-offset-2">mirá los planes</Link>.
          </p>
        )}
        {notice && <p role="status" className="mt-2 text-sm font-medium text-[#00205B]">{notice}</p>}
      </section>
    </div>
  );
}

export function FlightPlanner({ userName, signedIn, plans, profiles, limit, used, dataNote }: PlannerProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<PlanDraft>(() => loadDraft(userName));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; name: string } | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Sin almacenamiento, el plan dura hasta salir de la página.
    }
  }, [draft]);

  const setAircraft = useCallback((patch: Partial<PlanDraft["aircraft"]>) => setDraft((d) => ({ ...d, aircraft: { ...d.aircraft, ...patch } })), []);
  const setRoute = useCallback((patch: Partial<PlanDraft["route"]>) => setDraft((d) => ({ ...d, route: { ...d.route, ...patch } })), []);
  const setFlight = useCallback((patch: Partial<PlanDraft["flight"]>) => setDraft((d) => ({ ...d, flight: { ...d.flight, ...patch } })), []);
  const addWaypoint = useCallback((p: RoutePoint) => setDraft((d) => (d.route.waypoints.length >= 30 ? d : { ...d, route: { ...d.route, waypoints: [...d.route.waypoints, p] } })), []);

  const { legs, hours } = useMemo(() => draftLegs(draft), [draft]);
  const items = useMemo(() => buildItems(draft, hours), [draft, hours]);
  const points = useMemo(() => routePoints(draft), [draft]);
  // Para el mapa alcanza con lo cargado: muestra el origen aunque todavía no haya destino.
  const mapPoints = useMemo(() => [draft.route.origin, ...draft.route.waypoints, draft.route.destination].filter((p): p is RoutePoint => !!p), [draft.route]);
  const limitReached = limit !== null && used >= limit;

  const setWind = (index: number, patch: Partial<{ dir: string; speed: string }>) => {
    const winds = Array.from({ length: Math.max(legs.length, draft.route.winds.length) }, (_, i) => draft.route.winds[i] ?? { dir: "", speed: "" });
    winds[index] = { ...winds[index], ...patch };
    setRoute({ winds });
  };

  const openPlan = (plan: SavedPlan) => {
    const parsed = planSchema.safeParse(plan.data);
    if (!parsed.success) return setError("No se pudo abrir ese plan.");
    setDraft(parsed.data);
    setLoaded({ id: plan.id, name: plan.name });
    setError(null);
    setStep(4);
  };

  const reset = () => {
    if (!window.confirm("¿Empezar un plan nuevo? Se borra lo que cargaste y no guardaste.")) return;
    const fresh = emptyDraft();
    if (userName) fresh.flight.pilot = userName;
    setDraft(fresh);
    setLoaded(null);
    setStep(0);
  };

  const applyProfile = (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    const parsed = aircraftSchema.safeParse(profile?.data);
    if (parsed.success) setAircraft(parsed.data);
  };

  const saveProfile = () => {
    setProfileNotice(null);
    startTransition(async () => {
      const result = await saveAircraftProfileAction({ name: draft.aircraft.registration || "Aeronave", aircraft: draft.aircraft });
      setProfileNotice(result.ok ? "Aeronave guardada." : result.error);
      if (result.ok) router.refresh();
    });
  };

  const remove = (kind: "plan" | "profile", id: string) => {
    if (!window.confirm("¿Borrar? No se puede deshacer.")) return;
    startTransition(async () => {
      await (kind === "plan" ? deleteFlightPlanAction(id) : deleteAircraftProfileAction(id));
      if (kind === "plan" && loaded?.id === id) setLoaded(null);
      router.refresh();
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <nav aria-label="Pasos del plan de vuelo">
        <ol className="grid grid-cols-5 gap-1">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className={`w-full cursor-pointer border-t-[3px] pb-1 pt-2 text-left text-xs font-semibold sm:text-sm ${i === step ? "border-[#D62828] text-[#00205B]" : i < step ? "border-[#00205B] text-[#00205B]/80" : "border-[#00205B]/20 text-slate-600"} min-h-11`}>
                <span className="tabular-nums">{i + 1}</span> <span className="hidden sm:inline">{label}</span>
                <span className="block truncate sm:hidden">{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <h2 className="font-heading text-lg font-bold text-[#00205B]">{STEPS[step]}{loaded ? <span className="ml-2 text-sm font-medium text-slate-600">{loaded.name}</span> : null}</h2>
        <div className="flex flex-wrap gap-x-4">
          {step !== 4 && (
            <button type="button" onClick={() => setStep(4)} className="min-h-11 cursor-pointer font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]">
              Ver formulario OACI completo
            </button>
          )}
          <button type="button" onClick={reset} className="min-h-11 cursor-pointer text-slate-600 underline underline-offset-2 hover:text-[#00205B]">
            Empezar de nuevo
          </button>
        </div>
      </div>

      {error && <p role="alert" className="border-l-2 border-[#D62828] pl-3 text-sm font-medium text-[#00205B]">{error}</p>}

      {step === 0 && (
        <div className="space-y-5">
          {signedIn && profiles.length > 0 && (
            <div>
              <h3 className="va-label mb-1">Tus aeronaves</h3>
              <ul className="flex flex-wrap gap-2">
                {profiles.map((p) => (
                  <li key={p.id} className="flex items-center rounded-md border border-[#00205B]/20 bg-white">
                    <button type="button" onClick={() => applyProfile(p.id)} className="min-h-11 cursor-pointer px-3 text-sm font-semibold text-[#00205B] hover:bg-slate-50">{p.name}</button>
                    <button type="button" onClick={() => remove("profile", p.id)} aria-label={`Borrar ${p.name}`} disabled={pending} className="flex h-11 w-11 cursor-pointer items-center justify-center text-slate-500 hover:text-[#D62828]">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <AircraftForm draft={draft} setAircraft={setAircraft} items={items} showMissing={false} />
          {signedIn && (
            <div>
              <button type="button" onClick={saveProfile} disabled={pending || limitReached} className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-[#00205B]/25 bg-white px-4 text-sm font-bold text-[#00205B] hover:bg-slate-50 disabled:opacity-60">
                Guardar esta aeronave
              </button>
              {limitReached && <p className="mt-1 text-sm text-slate-700">Llegaste al límite de tu plan para guardar.</p>}
              {profileNotice && <p role="status" className="mt-1 text-sm text-[#00205B]">{profileNotice}</p>}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <PointField label="Salida" value={draft.route.origin} onChange={(origin) => { setRoute({ origin }); setError(null); }} onError={setError} />
            <PointField label="Destino" value={draft.route.destination} onChange={(destination) => { setRoute({ destination }); setError(null); }} onError={setError} />
            <PointField label="Alternativa (opcional)" value={draft.route.alternate} onChange={(alternate) => { setRoute({ alternate }); setError(null); }} onError={setError} />
          </div>
          <RouteMap points={mapPoints} onAddWaypoint={addWaypoint} />
          <div>
            <PlacePicker
              label="Agregar punto intermedio"
              onPick={(p) => {
                const point = toRoutePoint(p);
                if (point) addWaypoint(point);
                else setError(`${p.name} no tiene coordenadas en el listado oficial.`);
              }}
            />
            {draft.route.waypoints.length > 0 && (
              <ol className="mt-2 divide-y divide-[#00205B]/10 text-sm">
                {draft.route.waypoints.map((w, i) => (
                  <li key={`${w.code}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[#00205B]"><span className="tabular-nums">{i + 1}.</span> {w.icao ?? w.name}{w.icao ? ` ${w.name}` : ""}</span>
                    <button type="button" onClick={() => setRoute({ waypoints: draft.route.waypoints.filter((_, n) => n !== i), winds: [] })} aria-label={`Quitar ${w.name}`} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-slate-500 hover:text-[#D62828]">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {points.length > 1 && (
            <section aria-labelledby="fp-legs">
              <h3 id="fp-legs" className="font-heading text-base font-bold text-[#00205B]">Tramos</h3>
              <p className="mt-1 text-sm text-slate-700">Cargá el viento pronosticado de cada tramo, en grados verdaderos y nudos. Sin viento, se calcula en aire calmo.</p>
              <LegList
                legs={legs}
                renderWind={(i) => (
                  <div className="mt-2 grid max-w-sm grid-cols-2 gap-2">
                    <Field label="Viento desde (°V)" value={draft.route.winds[i]?.dir ?? ""} onChange={(dir) => setWind(i, { dir: dir.replace(/\D/g, "").slice(0, 3) })} inputMode="numeric" placeholder="270" />
                    <Field label="Velocidad (kt)" value={draft.route.winds[i]?.speed ?? ""} onChange={(speed) => setWind(i, { speed: speed.replace(/\D/g, "").slice(0, 3) })} inputMode="numeric" placeholder="15" />
                  </div>
                )}
              />
              <p className="mt-2 text-sm font-semibold tabular-nums text-[#00205B]">Total: {totalDistanceNm(legs).toFixed(0)} NM</p>
              {!draft.aircraft.cruiseKt && <p className="mt-1 text-sm text-slate-700">Cargá la velocidad de crucero en el paso Aeronave para ver rumbo con viento y tiempo.</p>}
            </section>
          )}
        </div>
      )}

      {step === 2 && <FlightForm draft={draft} setFlight={setFlight} items={items} showMissing={false} />}
      {step === 3 && <Briefing draft={draft} />}
      {step === 4 && (
        <ResultStep
          key={loaded?.id ?? "nuevo"}
          draft={draft}
          setAircraft={setAircraft}
          setFlight={setFlight}
          hours={hours}
          signedIn={signedIn}
          loaded={loaded}
          limitReached={limitReached}
          onSaved={(plan) => {
            setLoaded(plan);
            router.refresh();
          }}
        />
      )}

      <div className="flex justify-between gap-2 border-t border-[#00205B]/15 pt-4">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-[#00205B]/25 bg-white px-4 text-sm font-bold text-[#00205B] hover:bg-slate-50 disabled:invisible">
          Anterior
        </button>
        <button type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1} className="inline-flex min-h-11 cursor-pointer items-center rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#00307F] disabled:invisible">
          Siguiente: {STEPS[Math.min(step + 1, STEPS.length - 1)]}
        </button>
      </div>

      {signedIn && (
        <section aria-labelledby="fp-saved" className="border-t border-[#00205B]/15 pt-4">
          <h2 id="fp-saved" className="va-label">
            Tus planes{limit !== null ? ` · ${used} de ${limit} lugares usados, sumando aeronaves` : ""}
          </h2>
          {plans.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">Todavía no guardaste ningún plan.</p>
          ) : (
            <ul className="mt-1 divide-y divide-[#00205B]/10">
              {plans.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => openPlan(p)} className="min-h-11 min-w-0 flex-1 cursor-pointer py-2 text-left text-sm font-semibold text-[#00205B] hover:text-[#D62828]">
                    {p.name}
                    {p.departureAt && <span className="ml-2 font-normal tabular-nums text-slate-600">{new Date(p.departureAt).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>}
                  </button>
                  <button type="button" onClick={() => remove("plan", p.id)} disabled={pending} aria-label={`Borrar ${p.name}`} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-slate-500 hover:text-[#D62828]">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="text-xs text-slate-500">{dataNote}</p>
    </div>
  );
}
