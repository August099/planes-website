"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getSellerMetricsAction } from "@/app/actions/seller-metrics-actions";
import type { ChannelKey, FullMetrics, ListingMetrics, MetricsTotal, SellerMetrics, SourceKey } from "@/lib/seller-metrics";
import { regionName } from "@/lib/ar-regions";

// VA-151: pestaña "Métricas" del perfil propio (cuenta VA). Pocas y útiles: resumen con variación,
// vistas por día (SVG propio, sin librerías), contactos por canal y rendimiento por aviso. Se carga
// con next/dynamic solo al abrir la pestaña. VA-171: con el nivel completo (Broker, la respuesta trae
// "full"), además 90 días y rango propio, fuentes de tráfico, provincias, comparador, clics desde la
// Página VA, efecto de las republicaciones y "Exportar CSV".

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const BOX = "rounded-lg border border-[#001F58]/12 bg-white";
const NUM = new Intl.NumberFormat("es-AR");
const DAY_FMT = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const SINCE_FMT = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
const SOURCE_LABEL: Record<SourceKey, string> = { SEARCH: "Google y buscadores", SOCIAL: "Redes sociales", WHATSAPP: "WhatsApp", DIRECT: "Directo", OTHER: "Otros sitios" };
const DATE_FMT = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
const CHANNEL_LABEL: Record<ChannelKey, string> = { WHATSAPP: "WhatsApp", PHONE: "Teléfono", EMAIL: "Email", FORM: "Preguntas" };
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Activo", PAUSED: "Pausado", MODERATED: "Pausado por moderación", PENDING_PAYMENT: "Pendiente de pago", EXPIRED: "Vencido", SOLD: "Vendido" };

type SortKey = "views" | "contacts" | "favorites" | "contactRate" | "compares" | "title";
type Period = number | { from: string; to: string };

export default function SellerMetricsPanel() {
  const [days, setDays] = useState<Period>(30);
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 60 * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { from: iso(from), to: iso(to) };
  });
  const [data, setData] = useState<SellerMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "views", dir: -1 });

  useEffect(() => {
    let alive = true;
    getSellerMetricsAction(days).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.ok) {
        setData(res.data);
        setError(null);
      } else setError(res.error);
    });
    return () => {
      alive = false;
    };
  }, [days]);

  const changeDays = (d: Period) => {
    if (typeof d === "number" && d === days) return;
    setLoading(true);
    setDays(d);
  };

  const listings = useMemo(() => sortListings(data?.listings ?? [], sort), [data, sort]);
  const best = useMemo(() => {
    const ls = data?.listings ?? [];
    const mostViewed = ls.reduce<ListingMetrics | null>((a, l) => (l.views > 0 && (!a || l.views > a.views) ? l : a), null);
    const bestRate = ls.reduce<ListingMetrics | null>((a, l) => (l.contactRate != null && l.contactRate > 0 && (!a || l.contactRate > (a.contactRate ?? 0)) ? l : a), null);
    return { mostViewed: mostViewed?.id, bestRate: bestRate?.id };
  }, [data]);

  return (
    <section className="space-y-5" aria-labelledby="metrics-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={LABEL}>Cuenta VA</p>
          <h2 id="metrics-title" className="text-xl font-bold text-[#001F58]">
            Métricas de tus avisos
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Período">
          {(data?.full ? [7, 30, 90] : [7, 30]).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => changeDays(d)}
              className={`min-h-9 rounded-md border px-3 text-xs font-semibold transition-colors ${days === d ? "border-[#001F58] bg-[#001F58] text-white" : "border-[#001F58]/20 bg-white text-[#001F58] hover:border-[#001F58]/50"}`}
            >
              Últimos {d} días
            </button>
          ))}
          {/* VA-171: rango propio (nivel completo). */}
          {data?.full && (
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <input type="date" aria-label="Desde" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="min-h-9 rounded-md border border-[#001F58]/20 px-2" />
              <span>a</span>
              <input type="date" aria-label="Hasta" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="min-h-9 rounded-md border border-[#001F58]/20 px-2" />
              <button
                type="button"
                aria-pressed={typeof days !== "number"}
                onClick={() => changeDays({ ...range })}
                className={`min-h-9 rounded-md border px-3 font-semibold transition-colors ${typeof days !== "number" ? "border-[#001F58] bg-[#001F58] text-white" : "border-[#001F58]/20 bg-white text-[#001F58] hover:border-[#001F58]/50"}`}
              >
                Ver rango
              </button>
            </span>
          )}
          {data?.full && (
            <button type="button" onClick={() => exportCsv(data)} className="min-h-9 rounded-md border border-[#001F58]/20 bg-white px-3 text-xs font-semibold text-[#001F58] hover:border-[#001F58]/50">
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="text-sm text-slate-500">Cargando…</p>}

      {data && (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* 1. Resumen */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Vistas" total={data.totals.views} days={data.days} />
            <Stat label="Contactos" total={data.totals.contacts} days={data.days} />
            <Stat label="Favoritos nuevos" total={data.totals.favorites} days={data.days} />
            <Stat
              label="Visitas a tu Página"
              total={data.totals.profileVisits}
              days={data.days}
              note={data.profileVisitsSince ? `Desde el ${SINCE_FMT.format(new Date(data.profileVisitsSince))}` : "Se cuentan desde ahora"}
            />
          </div>

          {/* 2. Vistas por día */}
          <div className={`${BOX} p-4 sm:p-5`}>
            <p className={LABEL}>Vistas por día</p>
            {data.viewsByDay.every((d) => d.views === 0) ? <Empty /> : <ViewsChart points={data.viewsByDay} />}
          </div>

          {/* 3. Contactos por canal */}
          <div className={`${BOX} p-4 sm:p-5`}>
            <p className={LABEL}>Contactos por canal</p>
            {data.totals.contacts.current === 0 ? <Empty /> : <Channels channels={data.channels} />}
          </div>

          {/* VA-171: secciones del nivel completo */}
          {data.full && <FullSections full={data.full} days={data.days} />}

          {/* 4. Rendimiento por aviso */}
          <div className={BOX}>
            <p className={`border-b border-[#001F58]/10 px-4 py-3 sm:px-5 ${LABEL}`}>Rendimiento por aviso</p>
            {listings.length === 0 ? (
              <div className="px-4 py-6 sm:px-5">
                <Empty text="Todavía no tenés avisos." />
              </div>
            ) : (
              <>
                <ListingTable listings={listings} sort={sort} onSort={setSort} best={best} showCompares={!!data.full} />
                <ListingCards listings={listings} best={best} />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function sortListings(ls: ListingMetrics[], sort: { key: SortKey; dir: 1 | -1 }) {
  const withViews = ls.filter((l) => l.views > 0);
  const zero = ls.filter((l) => l.views === 0);
  const val = (l: ListingMetrics) => (sort.key === "title" ? l.title.toLowerCase() : (l[sort.key] ?? -1));
  withViews.sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
  });
  // Los avisos sin vistas en el período van al final, con una sugerencia.
  return [...withViews, ...zero];
}

function Stat({ label, total, days, note }: { label: string; total: MetricsTotal; days: number; note?: string }) {
  const up = (total.change ?? 0) >= 0;
  return (
    <div className={`${BOX} p-4`}>
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#001F58]">{NUM.format(total.current)}</p>
      <p className={`mt-1 text-[11px] ${total.change == null ? "text-slate-500" : up ? "text-emerald-700" : "text-red-700"}`}>
        {total.change == null ? `Sin datos de los ${days} días anteriores` : `${total.change > 0 ? "+" : ""}${total.change} % vs. ${days} días anteriores`}
      </p>
      {note && <p className="mt-0.5 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

function Empty({ text = "Todavía no hay datos de este período." }: { text?: string }) {
  return <p className="mt-3 text-sm text-slate-500">{text}</p>;
}

function ViewsChart({ points }: { points: { date: string; views: number }[] }) {
  // El SVG usa el ancho real del contenedor (sin estirar el texto ni dejar márgenes vacíos).
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 180;
  const pad = { l: 28, r: 8, t: 10, b: 22 };
  const max = Math.max(1, ...points.map((p) => p.views));
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, points.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.views).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(3, Math.floor(W / 90))));
  const day = (s: string) => DAY_FMT.format(new Date(`${s}T00:00:00Z`));
  return (
    <div ref={ref} className="mt-3 w-full">
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label={`Vistas por día: máximo ${max}`}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)} stroke="#001F58" strokeOpacity="0.08" />
          <text x={pad.l - 6} y={y(max * t) + 3} textAnchor="end" fontSize="10" fill="#64748b">
            {Math.round(max * t)}
          </text>
        </g>
      ))}
      <path d={area} fill="#001F58" fillOpacity="0.06" />
      <path d={path} fill="none" stroke="#001F58" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.views)} r="2.5" fill="#E70F1F">
            <title>{`${day(p.date)}: ${p.views} vistas`}</title>
          </circle>
          {i % labelEvery === 0 && (
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#64748b">
              {day(p.date)}
            </text>
          )}
        </g>
      ))}
    </svg>
    </div>
  );
}

function Channels({ channels }: { channels: { key: ChannelKey; count: number }[] }) {
  const total = channels.reduce((s, c) => s + c.count, 0) || 1;
  return (
    <ul className="mt-3 space-y-2.5">
      {channels.map((c) => {
        const pct = Math.round((c.count / total) * 100);
        return (
          <li key={c.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)_5rem]">
            <span className="truncate text-slate-700">{CHANNEL_LABEL[c.key]}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <span className="block h-full rounded-full bg-[#001F58]" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-right tabular-nums text-slate-700">
              {NUM.format(c.count)} <span className="text-xs text-slate-500">({pct} %)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const rate = (r: number | null) => (r == null ? "—" : `${String(r).replace(".", ",")} %`);

function Badges({ l, best }: { l: ListingMetrics; best: { mostViewed?: string; bestRate?: string } }) {
  return (
    <>
      {best.mostViewed === l.id && <span className="rounded-sm bg-[#001F58] px-1.5 py-0.5 text-[10px] font-bold text-white">Más visto</span>}
      {best.bestRate === l.id && <span className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">Mejor tasa de contacto</span>}
    </>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <span className="relative block h-10 w-14 shrink-0 overflow-hidden rounded bg-slate-100">
      {url && <Image src={url} alt="" fill sizes="56px" className="object-cover" />}
    </span>
  );
}

function ListingTable({
  listings,
  sort,
  onSort,
  best,
  showCompares = false,
}: {
  showCompares?: boolean;
  listings: ListingMetrics[];
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (s: { key: SortKey; dir: 1 | -1 }) => void;
  best: { mostViewed?: string; bestRate?: string };
}) {
  const th = (key: SortKey, label: string, align = "text-right") => (
    <th className={`px-4 py-2 font-semibold ${align}`} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort({ key, dir: sort.key === key ? (sort.dir === 1 ? -1 : 1) : -1 })} className="inline-flex items-center gap-1 hover:text-[#001F58]">
        {label}
        {sort.key === key ? (sort.dir === 1 ? "↑" : "↓") : ""}
      </button>
    </th>
  );
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead className={`border-b border-[#001F58]/10 text-left ${LABEL}`}>
          <tr>
            {th("title", "Aviso", "text-left")}
            <th className="px-4 py-2 text-left font-semibold">Estado</th>
            {th("views", "Vistas")}
            {th("contacts", "Contactos")}
            {th("favorites", "Favoritos")}
            {th("contactRate", "Tasa de contacto")}
            {showCompares && th("compares", "Comparador")}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {listings.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-3">
                  <Thumb url={l.imageUrl} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[#001F58]">{l.title}</span>
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      <Badges l={l} best={best} />
                      {l.views === 0 && <span className="text-[11px] text-slate-500">Probá mejorar las fotos o el precio</span>}
                    </span>
                  </span>
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-600">{STATUS_LABEL[l.status] ?? l.status}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{NUM.format(l.views)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{NUM.format(l.contacts)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{NUM.format(l.favorites)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{rate(l.contactRate)}</td>
              {showCompares && <td className="px-4 py-2.5 text-right tabular-nums">{NUM.format(l.compares)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingCards({ listings, best }: { listings: ListingMetrics[]; best: { mostViewed?: string; bestRate?: string } }) {
  return (
    <ul className="divide-y divide-slate-100 md:hidden">
      {listings.map((l) => (
        <li key={l.id} className="space-y-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <Thumb url={l.imageUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#001F58]">{l.title}</p>
              <p className="text-xs text-slate-500">{STATUS_LABEL[l.status] ?? l.status}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badges l={l} best={best} />
          </div>
          <dl className="grid grid-cols-4 gap-2 text-center">
            {[
              ["Vistas", NUM.format(l.views)],
              ["Contactos", NUM.format(l.contacts)],
              ["Favoritos", NUM.format(l.favorites)],
              ["Tasa", rate(l.contactRate)],
            ].map(([k, v]) => (
              <div key={k} className="rounded bg-slate-50 px-1 py-1.5">
                <dt className="text-[10px] text-slate-500">{k}</dt>
                <dd className="text-sm font-semibold tabular-nums text-[#001F58]">{v}</dd>
              </div>
            ))}
          </dl>
          {l.views === 0 && <p className="text-xs text-slate-500">Probá mejorar las fotos o el precio.</p>}
        </li>
      ))}
    </ul>
  );
}

// VA-171: fuentes, provincias, Página VA y republicaciones (nivel completo).
function FullSections({ full, days }: { full: FullMetrics; days: number }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={`${BOX} p-4 sm:p-5`}>
          <p className={LABEL}>Fuentes de tráfico</p>
          {full.sourcesBase === 0 ? (
            <Empty />
          ) : (
            <Bars rows={full.sources.map((x) => ({ key: x.key, label: SOURCE_LABEL[x.key], count: x.count }))} />
          )}
          <p className="mt-3 text-[11px] leading-snug text-slate-500">
            Parcial: sale de {NUM.format(full.sourcesBase)} vistas de visitantes que aceptaron las cookies de medición.
          </p>
        </div>
        <div className={`${BOX} p-4 sm:p-5`}>
          <p className={LABEL}>Provincia aproximada de los visitantes</p>
          {full.regions.length === 0 ? <Empty /> : <Bars rows={full.regions.map((r) => ({ key: r.code, label: regionName(r.code), count: r.count }))} />}
          <p className="mt-3 text-[11px] leading-snug text-slate-500">Aproximada y sumada: nunca quién te visitó.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stat label="Clics desde tu Página a tus avisos" total={full.profileListingClicks} days={days} />
        <div className={`${BOX} p-4`}>
          <p className="text-xs text-slate-600">Efecto de tus republicaciones (vistas 7 días antes y después)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#001F58]">
            {NUM.format(full.republish.totalBefore)} → {NUM.format(full.republish.totalAfter)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {full.republish.items.length ? `${full.republish.items.length} republicaciones en el período` : "Sin republicaciones en el período"}
          </p>
        </div>
      </div>

      {full.republish.items.length > 0 && (
        <div className={BOX}>
          <p className={`border-b border-[#001F58]/10 px-4 py-3 sm:px-5 ${LABEL}`}>Republicaciones</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className={`border-b border-[#001F58]/10 text-left ${LABEL}`}>
                <tr>
                  <th className="px-4 py-2 font-semibold">Fecha</th>
                  <th className="px-4 py-2 font-semibold">Aviso</th>
                  <th className="px-4 py-2 text-right font-semibold">Vistas antes</th>
                  <th className="px-4 py-2 text-right font-semibold">Vistas después</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {full.republish.items.map((r, i) => (
                  <tr key={`${r.date}-${i}`}>
                    <td className="px-4 py-2 tabular-nums text-slate-600">{DATE_FMT.format(new Date(r.date))}</td>
                    <td className="max-w-[18rem] truncate px-4 py-2 text-[#001F58]">{r.title}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{NUM.format(r.before)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{NUM.format(r.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function Bars({ rows }: { rows: { key: string; label: string; count: number }[] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0) || 1;
  return (
    <ul className="mt-3 space-y-2.5">
      {rows.map((r) => {
        const pct = Math.round((r.count / total) * 100);
        return (
          <li key={r.key} className="grid grid-cols-[8.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm">
            <span className="truncate text-slate-700">{r.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <span className="block h-full rounded-full bg-[#001F58]" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-right tabular-nums text-slate-700">
              {NUM.format(r.count)} <span className="text-xs text-slate-500">({pct} %)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** VA-171: CSV del período (resumen y avisos), armado en el navegador. */
function exportCsv(data: SellerMetrics) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: (string | number)[][] = [
    ["Período", `${data.from.slice(0, 10)} a ${data.to.slice(0, 10)}`],
    ["Vistas", data.totals.views.current],
    ["Contactos", data.totals.contacts.current],
    ["Favoritos nuevos", data.totals.favorites.current],
    ["Visitas a la Página", data.totals.profileVisits.current],
    [],
    ["Aviso", "Tipo", "Estado", "Vistas", "Contactos", "Favoritos", "Tasa de contacto (%)", "Comparador"],
    ...data.listings.map((l) => [l.title, l.kind === "AIRCRAFT" ? "Aeronave" : "Repuesto", STATUS_LABEL[l.status] ?? l.status, l.views, l.contacts, l.favorites, l.contactRate ?? "", l.compares]),
  ];
  const csv = "\uFEFF" + lines.map((row) => row.map(q).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `metricas-${data.from.slice(0, 10)}-a-${data.to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
