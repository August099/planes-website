"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Edit, Eye, Heart, Loader2, MessageSquare, Pause, Play, Trash2 } from "lucide-react";
import { AircraftCard } from "@/components/ui/AircraftCard";
import { SparePartCard } from "@/components/ui/SparePartCard";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import { RepublishButton, RepublishNotice } from "@/components/ui/profile/RepublishControls";
import type { RepublishView } from "@/lib/republish";
import { logProfileListingClick } from "@/app/actions/analytics-actions";

// VA-97: una sola grilla de publicaciones en el perfil (antes, una pestaña por tipo). Arriba,
// interruptores por tipo (combinables, todos prendidos por defecto) y, en el panel propio, filtros por
// estado con contadores. Todo queda en la URL (?tipo=…&estado=…) para compartir o volver.
// Las tarjetas son las mismas de los listados; el dueño ve debajo el estado, las métricas y las
// acciones. VA-152: sin vencimiento ni pagos por aviso; arriba, el uso del cupo, y en cada aviso
// Pausar / Activar / Vendido (activar necesita cupo libre, lo controla el servidor). VA-167: arriba, el
// cartel de republicaciones (o "Republicar todas" del Broker) y, en cada aviso activo, "Republicar".

type Listing = {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  province: string | null;
  category: { id: string; name: string } | null;
  images: { url: string }[];
  status?: string;
  createdAt?: string;
  _count?: { favorites: number; questions: number; analyticsEvents: number };
};
type AircraftListing = Listing & { year: number; totalTimeHours: number | null };
type PartListing = Listing & { inPesos: boolean };

type Kind = "aeronaves" | "repuestos";
type StatusKey = "activos" | "pausados" | "vendidos";
export type StatusTarget = "ACTIVE" | "PAUSED" | "SOLD";
type QuotaLine = { used: number; limit: number | null };
export type ProfileQuota = { planName: string; aircraft: QuotaLine; parts: QuotaLine };
// VA-154: motivo de la pausa por moderación y si el dueño ya pidió revisión (por id de aviso).
export type ModerationMap = Record<string, { reason: string | null; reviewRequested: boolean }>;

const KINDS: { key: Kind; label: string }[] = [
  { key: "aeronaves", label: "Aeronaves" },
  { key: "repuestos", label: "Repuestos" },
];
const STATUSES: { key: StatusKey; label: string }[] = [
  { key: "activos", label: "Activos" },
  { key: "pausados", label: "Pausados" },
  { key: "vendidos", label: "Vendidos" },
];

// Los estados viejos (vencido, pendiente de pago) y el moderado (VA-154) se cuentan como pausados.
function statusOf(l: Listing): StatusKey {
  if (l.status === "SOLD") return "vendidos";
  if (l.status === "ACTIVE") return "activos";
  return "pausados";
}

const BADGE: Record<StatusKey, { text: string; tone: string }> = {
  activos: { text: "Activo", tone: "bg-emerald-50 text-emerald-700" },
  pausados: { text: "Pausado", tone: "bg-slate-100 text-slate-700" },
  vendidos: { text: "Vendido", tone: "bg-slate-100 text-slate-700" },
};

function quotaPart(label: string, q: QuotaLine) {
  return `${label} ${q.used}/${q.limit ?? "∞"}`;
}

const CHIP = "inline-flex min-h-9 items-center gap-1.5 rounded-sm border px-3 text-xs font-bold transition-colors cursor-pointer";
const CHIP_ON = "border-[#00205B] bg-[#00205B] text-white";
const CHIP_OFF = "border-[#00205B]/20 bg-white text-[#00205B] hover:border-[#D62828] hover:text-[#D62828]";

export function ProfileListings({
  aircrafts,
  spareParts,
  isOwner,
  favIds,
  quota,
  republish = null,
  profileUserId,
  moderation = {},
  onStatus,
  onRequestReview,
  onDelete,
  loadingId,
}: {
  aircrafts: AircraftListing[];
  spareParts: PartListing[];
  isOwner: boolean;
  favIds: string[];
  quota?: ProfileQuota | null;
  republish?: RepublishView | null;
  /** VA-171: dueño de la página, para contar los clics de los visitantes hacia sus avisos. */
  profileUserId?: string;
  moderation?: ModerationMap;
  onStatus: (id: string, type: "aircraft" | "sparepart", to: StatusTarget) => void;
  onRequestReview: (id: string, type: "aircraft" | "sparepart") => void;
  onDelete: (id: string, type: "aircraft" | "sparepart") => void;
  loadingId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const kindsParam = params.get("tipo");
  const kinds = new Set<Kind>(kindsParam ? (kindsParam.split(",").filter((k) => k === "aeronaves" || k === "repuestos") as Kind[]) : ["aeronaves", "repuestos"]);
  if (kinds.size === 0) KINDS.forEach((k) => kinds.add(k.key));
  const statusParam = params.get("estado");
  const status = isOwner && STATUSES.some((s) => s.key === statusParam) ? (statusParam as StatusKey) : null;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const toggleKind = (k: Kind) => {
    const next = new Set(kinds);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    // Apagar el último deja los dos prendidos (no hay grilla vacía por accidente).
    const value = next.size === 0 || next.size === KINDS.length ? null : [...next].join(",");
    setParam("tipo", value);
  };

  const all = [
    ...aircrafts.map((l) => ({ kind: "aeronaves" as const, l })),
    ...spareParts.map((l) => ({ kind: "repuestos" as const, l })),
  ].sort((a, b) => (b.l.createdAt ?? "").localeCompare(a.l.createdAt ?? ""));
  const ofKind = all.filter((x) => kinds.has(x.kind));
  const counts = Object.fromEntries(STATUSES.map((s) => [s.key, ofKind.filter((x) => statusOf(x.l) === s.key).length])) as Record<StatusKey, number>;
  const shown = status ? ofKind.filter((x) => statusOf(x.l) === status) : ofKind;

  const full = (q: QuotaLine) => q.limit !== null && q.used >= q.limit;
  return (
    <div className="space-y-5">
      {isOwner && quota && (
        // 27/10 (socio): en rojo para que se note.
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[20px] bg-[#D62828] px-4 py-3 text-sm text-white shadow-sm">
          <span>
            <span className="font-bold">Plan {quota.planName}</span> ·{" "}
            <span className="tabular-nums">
              {quotaPart("Aviones", quota.aircraft)} · {quotaPart("Repuestos", quota.parts)}
            </span>
          </span>
          {/* VA-186: siempre, no solo con el cupo lleno. */}
          <Link href="/plans" className="font-bold text-white underline underline-offset-2 hover:text-white/80">
            {full(quota.aircraft) || full(quota.parts) ? "Ver planes con más cupo" : "Planes y precios"}
          </Link>
        </p>
      )}
      {isOwner && republish && <RepublishNotice view={republish} onChooseListings={() => setParam("estado", "activos")} />}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tipo de publicación">
          {KINDS.map((k) => {
            const on = kinds.has(k.key);
            const n = k.key === "aeronaves" ? aircrafts.length : spareParts.length;
            return (
              <button key={k.key} type="button" aria-pressed={on} onClick={() => toggleKind(k.key)} className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
                {k.label} <span className="tabular-nums opacity-80">({n})</span>
              </button>
            );
          })}
        </div>
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Estado de la publicación">
            <button type="button" aria-pressed={!status} onClick={() => setParam("estado", null)} className={`${CHIP} ${!status ? CHIP_ON : CHIP_OFF}`}>
              Todos <span className="tabular-nums opacity-80">({ofKind.length})</span>
            </button>
            {STATUSES.map((s) => (
              <button key={s.key} type="button" aria-pressed={status === s.key} onClick={() => setParam("estado", status === s.key ? null : s.key)} className={`${CHIP} ${status === s.key ? CHIP_ON : CHIP_OFF}`}>
                {s.label} <span className="tabular-nums opacity-80">({counts[s.key]})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="va-plate px-5 py-8 text-center text-sm text-slate-600">
          {all.length === 0 ? (isOwner ? "Todavía no publicaste nada." : "Este vendedor no tiene publicaciones activas.") : "No hay publicaciones con estos filtros."}
        </p>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map(({ kind, l }) => {
            const type = kind === "aeronaves" ? "aircraft" : "sparepart";
            const st = statusOf(l);
            return (
              <div
                key={`${kind}-${l.id}`}
                className="flex h-full flex-col justify-between space-y-2"
                onClickCapture={
                  !isOwner && profileUserId
                    ? (e) => {
                        // Solo el link al aviso (no favoritos, compartir ni comparar).
                        if ((e.target as HTMLElement).closest("button")) return;
                        if ((e.target as HTMLElement).closest("a")) void logProfileListingClick(profileUserId, kind === "aeronaves" ? "AIRCRAFT" : "SPARE_PART", l.id);
                      }
                    : undefined
                }
              >
                {kind === "aeronaves" ? (
                  <AircraftCard
                    id={l.id}
                    title={l.title}
                    price={l.price}
                    year={(l as AircraftListing).year}
                    category={l.category}
                    totalTimeHours={(l as AircraftListing).totalTimeHours}
                    city={l.city}
                    province={l.province}
                    imageUrl={l.images[0]?.url ?? PLACEHOLDER_IMAGE}
                    isFavoriteInitial={favIds.includes(l.id)}
                  />
                ) : (
                  <SparePartCard
                    id={l.id}
                    title={l.title}
                    price={l.price}
                    inPesos={(l as PartListing).inPesos}
                    category={l.category}
                    city={l.city}
                    province={l.province}
                    imageUrl={l.images[0]?.url ?? PLACEHOLDER_IMAGE}
                    isFavoriteInitial={favIds.includes(l.id)}
                  />
                )}

                {isOwner && (
                  <OwnerPanel
                    l={l}
                    type={type}
                    st={st}
                    moderation={l.status === "MODERATED" ? moderation[l.id] ?? { reason: null, reviewRequested: false } : null}
                    republish={republish}
                    onStatus={onStatus}
                    onRequestReview={onRequestReview}
                    onDelete={onDelete}
                    loadingId={loadingId}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ACTION =
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-[4px] px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 sm:min-h-0 sm:px-2.5 sm:text-[10px]";

function OwnerPanel({
  l,
  type,
  st,
  moderation,
  republish,
  onStatus,
  onRequestReview,
  onDelete,
  loadingId,
}: {
  l: Listing;
  type: "aircraft" | "sparepart";
  st: StatusKey;
  moderation: { reason: string | null; reviewRequested: boolean } | null;
  republish: RepublishView | null;
  onStatus: (id: string, type: "aircraft" | "sparepart", to: StatusTarget) => void;
  onRequestReview: (id: string, type: "aircraft" | "sparepart") => void;
  onDelete: (id: string, type: "aircraft" | "sparepart") => void;
  loadingId: string | null;
}) {
  const badge = moderation ? { text: "Pausado por moderación", tone: "bg-red-50 text-red-700" } : BADGE[st];
  const busy = loadingId === l.id;

  return (
    <div className="space-y-2 va-plate p-3 text-[11px] text-slate-600">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#00205B]/10 pb-1.5">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.tone}`}>{badge.text}</span>
        <div className="flex items-center gap-1">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-label="Guardando" />}
          {moderation && (
            <button
              type="button"
              disabled={busy || moderation.reviewRequested}
              onClick={() => onRequestReview(l.id, type)}
              className={`${ACTION} bg-[#00205B] text-white hover:bg-[#D62828]`}
              title="Editalo primero y después pedí que lo revisemos"
            >
              {moderation.reviewRequested ? "Revisión pedida" : "Pedir revisión"}
            </button>
          )}
          {!moderation && st === "activos" && republish && (
            <RepublishButton view={republish} id={l.id} kind={type === "aircraft" ? "AIRCRAFT" : "SPARE_PART"} className={`${ACTION} border border-[#00205B]/20 text-[#00205B] hover:border-[#00205B]`} />
          )}
          {!moderation && st === "activos" && (
            <button type="button" disabled={busy} onClick={() => onStatus(l.id, type, "PAUSED")} className={`${ACTION} border border-[#00205B]/20 text-[#00205B] hover:border-[#00205B]`}>
              <Pause className="h-3 w-3" />
              Pausar
            </button>
          )}
          {!moderation && st !== "activos" && (
            <button type="button" disabled={busy} onClick={() => onStatus(l.id, type, "ACTIVE")} className={`${ACTION} bg-[#00205B] text-white hover:bg-[#D62828]`}>
              <Play className="h-3 w-3" />
              {st === "vendidos" ? "Volver a publicar" : "Activar"}
            </button>
          )}
          {!moderation && st !== "vendidos" && (
            <button type="button" disabled={busy} onClick={() => onStatus(l.id, type, "SOLD")} className={`${ACTION} border border-[#00205B]/20 text-[#00205B] hover:border-[#00205B]`}>
              <CheckCircle2 className="h-3 w-3" />
              Vendido
            </button>
          )}
        </div>
      </div>
      {moderation?.reason && (
        <p className="border-l-2 border-[#D62828] pl-2 text-[11px] leading-snug text-slate-700">
          <span className="font-semibold text-[#00205B]">Motivo:</span> {moderation.reason}
        </p>
      )}

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5" title="Vistas">
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            {l._count?.analyticsEvents || 0}
          </span>
          <span className="flex items-center gap-0.5" title="Favoritos">
            <Heart className="h-3.5 w-3.5 text-[#D62828]" />
            {l._count?.favorites || 0}
          </span>
          <span className="flex items-center gap-0.5" title="Consultas">
            <MessageSquare className="h-3.5 w-3.5 text-[#00205B]/60" />
            {l._count?.questions || 0}
          </span>
        </div>

        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
          <Link
            href={`/publish?edit=${l.id}&type=${type === "aircraft" ? "aircraft" : "parts"}`}
            className="cursor-pointer rounded-[4px] p-3 text-[#00205B] hover:bg-[#F5F5F5] sm:p-1"
            aria-label="Editar publicación"
            title="Editar publicación"
          >
            <Edit className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(l.id, type)}
            className="cursor-pointer rounded-[4px] p-3 text-[#D62828] hover:bg-[#D62828]/8 sm:p-1"
            aria-label="Eliminar publicación"
            title="Eliminar publicación"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
