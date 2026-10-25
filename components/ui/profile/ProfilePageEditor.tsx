"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { saveProfilePageAction } from "@/app/actions/profile-page-actions";
import { ProfilePageSections, type PageCard } from "@/components/ui/profile/ProfilePageSections";
import { CAROUSEL_RULE_LABEL, CAROUSEL_RULES, MAX_SECTIONS, MAX_TEXT, newSection, type CarouselRule, type PageSection } from "@/lib/profile-page";
import { AIRCRAFT_CATEGORIES, ENGINE_LABELS } from "@/lib/aircraft-categories";

// VA-169: modo edición de la Página VA completa, sobre la misma página. Agregar sección, subir o bajar con
// flechas (sin arrastrar), ocultar, borrar y elegir avisos con casillas. Vista previa en escritorio o
// celular. "Publicar cambios", "Guardar borrador" o "Cancelar". La imagen y los datos se cambian en Ajustes.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const BTN = "inline-flex min-h-10 items-center gap-1.5 rounded-md border border-[#00205B]/20 px-3 text-sm font-semibold text-[#00205B] hover:bg-slate-50 disabled:opacity-40 cursor-pointer";
const TYPE_LABEL: Record<PageSection["type"], string> = { carousel: "Carrusel", grid: "Grilla de avisos", text: "Texto" };
const categoryLabel = (id: string) => {
  const c = AIRCRAFT_CATEGORIES.find((x) => x.id === id);
  return c ? (c.engine ? `${c.group} ${ENGINE_LABELS[c.engine]}` : c.group) : id;
};

export function ProfilePageEditor({ initial, listings, profileUserId, onClose }: { initial: PageSection[]; listings: PageCard[]; profileUserId: string; onClose: () => void }) {
  const router = useRouter();
  const [sections, setSections] = useState<PageSection[]>(initial);
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const update = (i: number, patch: Partial<PageSection>) => setSections((list) => list.map((s, k) => (k === i ? ({ ...s, ...patch } as PageSection) : s)));
  const move = (i: number, d: number) =>
    setSections((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const toggleId = (i: number, key: string) => {
    const s = sections[i];
    if (s.type === "text") return;
    update(i, { ids: s.ids.includes(key) ? s.ids.filter((k) => k !== key) : [...s.ids, key] });
  };
  const moveId = (i: number, key: string, d: number) => {
    const s = sections[i];
    if (s.type !== "grid") return;
    // Orden propio: parte del orden actual (los ordenados y después el resto por fecha).
    const keys = s.ids.length ? [...s.ids, ...listings.map((l) => l.key).filter((k) => !s.ids.includes(k))] : listings.map((l) => l.key);
    const a = keys.indexOf(key);
    const b = a + d;
    if (a < 0 || b < 0 || b >= keys.length) return;
    [keys[a], keys[b]] = [keys[b], keys[a]];
    update(i, { ids: keys });
  };

  const save = async (publish: boolean) => {
    setPending(true);
    setError(null);
    setNotice(null);
    const res = await saveProfilePageAction(sections, publish);
    setPending(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
    if (publish) onClose();
    else setNotice("Borrador guardado: todavía no lo ven los visitantes.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#00205B]/12 bg-white p-4">
        <div>
          <p className={LABEL}>Editando tu página personalizada</p>
          <p className="text-sm text-slate-600">Elegí qué secciones se ven y en qué orden. La portada, el logo y los datos se cambian en Ajustes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => save(true)} className="min-h-10 rounded-md bg-[#00205B] px-4 text-sm font-bold text-white hover:bg-[#001331] disabled:opacity-60 cursor-pointer">
            Publicar cambios
          </button>
          <button type="button" disabled={pending} onClick={() => save(false)} className={BTN}>
            Guardar borrador
          </button>
          <button type="button" disabled={pending} onClick={onClose} className={BTN}>
            Cancelar
          </button>
        </div>
        {error && <p className="w-full text-sm text-red-700">{error}</p>}
        {notice && <p className="w-full text-sm text-[#00205B]">{notice}</p>}
      </div>

      <ol className="space-y-3">
        {sections.map((s, i) => (
          <li key={s.id} className={`rounded-lg border border-[#00205B]/12 bg-white p-4 ${s.hidden ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={LABEL}>
                {i + 1} {"//"} {TYPE_LABEL[s.type]}
                {s.hidden && " · oculta"}
              </span>
              <span className="ml-auto flex gap-1">
                <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="p-2 text-slate-500 hover:text-[#00205B] disabled:opacity-30 cursor-pointer"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" aria-label="Bajar" disabled={i === sections.length - 1} onClick={() => move(i, 1)} className="p-2 text-slate-500 hover:text-[#00205B] disabled:opacity-30 cursor-pointer"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" aria-label={s.hidden ? "Mostrar" : "Ocultar"} onClick={() => update(i, { hidden: !s.hidden })} className="p-2 text-slate-500 hover:text-[#00205B] cursor-pointer">{s.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                <button type="button" aria-label="Borrar sección" onClick={() => setSections(sections.filter((_, k) => k !== i))} className="p-2 text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
              </span>
            </div>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Título</span>
                <input type="text" maxLength={60} value={s.title} onChange={(e) => update(i, { title: e.target.value })} className={INPUT} />
              </label>

              {s.type === "text" && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Texto ({s.body.length}/{MAX_TEXT})</span>
                  <textarea maxLength={MAX_TEXT} rows={5} value={s.body} onChange={(e) => update(i, { body: e.target.value })} className={INPUT} />
                </label>
              )}

              {s.type === "carousel" && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Qué avisos muestra</span>
                    <select value={s.rule} onChange={(e) => update(i, { rule: e.target.value as CarouselRule })} className={INPUT}>
                      {CAROUSEL_RULES.map((r) => <option key={r} value={r}>{CAROUSEL_RULE_LABEL[r]}</option>)}
                    </select>
                  </label>
                  {s.rule === "category" && (
                    <select aria-label="Categoría" value={s.categoryId ?? ""} onChange={(e) => update(i, { categoryId: e.target.value })} className={INPUT}>
                      <option value="">Elegí una categoría</option>
                      {AIRCRAFT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c.id)}</option>)}
                    </select>
                  )}
                  {s.rule === "manual" && (
                    <fieldset className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                      <legend className="sr-only">Avisos del carrusel</legend>
                      {listings.length === 0 && <p className="text-sm text-slate-500">No tenés avisos activos.</p>}
                      {listings.map((l) => (
                        <label key={l.key} className="flex min-h-9 items-center gap-2 text-sm">
                          <input type="checkbox" checked={s.ids.includes(l.key)} onChange={() => toggleId(i, l.key)} className="h-4 w-4 accent-[#00205B]" />
                          <span className="truncate">{l.title}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </>
              )}

              {s.type === "grid" && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Orden</span>
                    <select value={s.order} onChange={(e) => update(i, { order: e.target.value as "recent" | "manual" })} className={INPUT}>
                      <option value="recent">Los más recientes primero</option>
                      <option value="manual">Un orden propio</option>
                    </select>
                  </label>
                  {s.order === "manual" && (
                    <ol className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                      {(s.ids.length ? [...s.ids.map((k) => listings.find((l) => l.key === k)).filter((l): l is PageCard => !!l), ...listings.filter((l) => !s.ids.includes(l.key))] : listings).map((l, k, all) => (
                        <li key={l.key} className="flex min-h-9 items-center gap-1 text-sm">
                          <button type="button" aria-label={`Subir ${l.title}`} disabled={k === 0} onClick={() => moveId(i, l.key, -1)} className="p-1 text-slate-500 disabled:opacity-30 cursor-pointer"><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label={`Bajar ${l.title}`} disabled={k === all.length - 1} onClick={() => moveId(i, l.key, 1)} className="p-1 text-slate-500 disabled:opacity-30 cursor-pointer"><ArrowDown className="h-3.5 w-3.5" /></button>
                          <span className="truncate">{l.title}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        {(["carousel", "grid", "text"] as const).map((t) => (
          <button key={t} type="button" disabled={sections.length >= MAX_SECTIONS} onClick={() => setSections([...sections, newSection(t)])} className={BTN}>
            <Plus className="h-4 w-4" /> {TYPE_LABEL[t]}
          </button>
        ))}
        <span className="text-xs text-slate-500">Hasta {MAX_SECTIONS} secciones.</span>
      </div>

      <section className="space-y-3 rounded-lg border border-dashed border-[#00205B]/25 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={LABEL}>Vista previa</p>
          <div className="flex gap-2" role="group" aria-label="Pantalla de la vista previa">
            {(["desktop", "mobile"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={preview === v} onClick={() => setPreview(v)} className={`min-h-9 rounded-md border px-3 text-xs font-semibold ${preview === v ? "border-[#00205B] bg-[#00205B] text-white" : "border-[#00205B]/20 text-[#00205B]"} cursor-pointer`}>
                {v === "desktop" ? "Escritorio" : "Celular"}
              </button>
            ))}
          </div>
        </div>
        <div className={preview === "mobile" ? "mx-auto max-w-[375px] rounded-lg border border-slate-200 p-3" : ""}>
          <ProfilePageSections sections={sections} listings={listings} profileUserId={profileUserId} compact={preview === "mobile"} />
        </div>
      </section>
    </div>
  );
}
