"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mergeUserTaxonomyAction, renameUserTaxonomyAction, setUserTaxonomyHiddenAction } from "@/app/actions/admin-user-taxonomy-actions";

// VA-190: marcas y modelos que cargaron los usuarios con "Otra marca" / "Otro modelo". El admin les cambia el
// nombre, los une a una entrada de la lista (los avisos pasan a esa) o los oculta del formulario y los filtros.

type Entry = { id: string; name: string; hidden: boolean; createdAt: string; sourceAircraftId: string | null; listings: number; brandId?: string; brandName?: string };
type Option = { id: string; name: string; brandId?: string };

const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
const BTN = "min-h-9 rounded-md border border-[#001F58]/20 px-3 text-xs font-semibold text-[#001F58] hover:bg-slate-50 disabled:opacity-40 cursor-pointer";

function Row({ kind, entry, options }: { kind: "brand" | "model"; entry: Entry; options: Option[] }) {
  const router = useRouter();
  const [name, setName] = useState(entry.name);
  const [into, setInto] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const act = async (fn: () => Promise<{ ok: boolean; error?: string; moved?: number }>, done: string) => {
    setPending(true);
    setMessage(null);
    const res = await fn();
    setPending(false);
    if (!res.ok) return setMessage(res.error ?? "No se pudo guardar.");
    setMessage(done.replace("{n}", String(res.moved ?? 0)));
    router.refresh();
  };
  const targets = options.filter((o) => o.id !== entry.id && (kind === "brand" || o.brandId === entry.brandId));

  return (
    <li className="space-y-2 rounded-lg border border-[#001F58]/12 bg-white p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-bold text-[#001F58]">{entry.name}</span>
        {entry.brandName && <span className="text-slate-500">de {entry.brandName}</span>}
        {entry.hidden && <span className="text-xs font-semibold text-red-700">Oculta</span>}
        <span className="text-xs text-slate-500">
          Cargada el {DATE.format(new Date(entry.createdAt))} · {entry.listings} aviso{entry.listings === 1 ? "" : "s"}
          {entry.sourceAircraftId && (
            <>
              {" · "}
              <Link href={`/aircraft/${entry.sourceAircraftId}`} className="underline">
                aviso de origen
              </Link>
            </>
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:max-w-xs" />
        <button type="button" className={BTN} disabled={pending || name.trim() === entry.name} onClick={() => act(() => renameUserTaxonomyAction(kind, entry.id, name), "Nombre guardado.")}>
          Guardar nombre
        </button>
        <button type="button" className={BTN} disabled={pending} onClick={() => act(() => setUserTaxonomyHiddenAction(kind, entry.id, !entry.hidden), entry.hidden ? "Visible de nuevo." : "Oculta.")}>
          {entry.hidden ? "Mostrar" : "Ocultar"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label={`Unir a otra ${kind === "brand" ? "marca" : "modelo"}`} value={into} onChange={(e) => setInto(e.target.value)} className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm sm:max-w-xs">
          <option value="">{kind === "brand" ? "Unir a la marca…" : "Unir al modelo…"}</option>
          {targets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={BTN}
          disabled={pending || !into}
          onClick={() => {
            if (!confirm(`¿Unir "${entry.name}" a "${targets.find((t) => t.id === into)?.name}"? Sus avisos pasan a esa y esta se borra.`)) return;
            act(() => mergeUserTaxonomyAction(kind, entry.id, into), "Unida: {n} aviso(s) movidos.");
          }}
        >
          Unir
        </button>
      </div>
      {message && (
        <p className="text-xs text-slate-600" role="status">
          {message}
        </p>
      )}
    </li>
  );
}

export function UserTaxonomyReview({ brands, models, brandOptions, modelOptions }: { brands: Entry[]; models: Entry[]; brandOptions: Option[]; modelOptions: Option[] }) {
  return (
    <section className="space-y-3 rounded-lg border border-dashed border-[#001F58]/25 p-4" aria-labelledby="usuarios-taxonomia">
      <div>
        <h2 id="usuarios-taxonomia" className="text-lg font-bold text-[#001F58]">
          Cargadas por usuarios
        </h2>
        <p className="text-sm text-slate-600">Marcas y modelos que los usuarios escribieron con &quot;Otra marca&quot; u &quot;Otro modelo&quot;. Ya están en la lista; revisalos.</p>
      </div>
      {brands.length + models.length === 0 && <p className="text-sm text-slate-500">Todavía no hay ninguna.</p>}
      {brands.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-[#001F58]">Marcas ({brands.length})</h3>
          <ul className="space-y-2">
            {brands.map((b) => (
              <Row key={b.id} kind="brand" entry={b} options={brandOptions} />
            ))}
          </ul>
        </>
      )}
      {models.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-[#001F58]">Modelos ({models.length})</h3>
          <ul className="space-y-2">
            {models.map((m) => (
              <Row key={m.id} kind="model" entry={m} options={modelOptions} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
