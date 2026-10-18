"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { saveGuideAction } from "@/app/actions/admin-guides-actions";
import { GUIDE_ICONS } from "@/lib/guide-icons";
import { META_MAX, guideInputSchema } from "@/lib/guide-rules";

// VA-85: editor estructurado de una guía (sin editor de texto enriquecido: cada sección tiene
// título, ancla opcional, párrafos, viñetas y links, con botones para agregar, quitar y reordenar).
// Las reglas son las mismas del servidor (lib/guide-rules.ts).

type Link_ = { label: string; href: string };
export type EditorSection = { heading: string; id: string; paragraphs: string[]; bullets: string[]; links: Link_[] };
export type GuideEditorValues = {
  slug: string;
  title: string;
  excerpt: string;
  audience: "comprador" | "vendedor" | "todos";
  icon: string;
  metaDescription: string;
  sections: EditorSection[];
  source: Link_ | null;
  cta: Link_[];
  isGlossary: boolean;
  order: number;
  reviewedBy: string;
};

const LABEL = "mb-1 block text-xs font-semibold text-slate-600";
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const PLATE = "space-y-4 rounded-lg border border-[#001F58]/12 bg-white p-5 sm:p-6";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const SMALL_BTN = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#001F58] hover:bg-slate-100 cursor-pointer disabled:opacity-40";
const ICON_BTN = "flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#001F58] cursor-pointer disabled:opacity-30";

const emptySection = (): EditorSection => ({ heading: "", id: "", paragraphs: [""], bullets: [], links: [] });

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

function StringList({
  label,
  addLabel,
  values,
  multiline,
  onChange,
  errorPrefix,
  errors,
}: {
  label: string;
  addLabel: string;
  values: string[];
  multiline?: boolean;
  onChange: (v: string[]) => void;
  errorPrefix: string;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex items-start gap-1">
            {multiline ? (
              <textarea rows={3} value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} className={INPUT} aria-label={`${label} ${i + 1}`} />
            ) : (
              <input value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} className={INPUT} aria-label={`${label} ${i + 1}`} />
            )}
            <button type="button" className={ICON_BTN} onClick={() => onChange(move(values, i, -1))} disabled={i === 0} aria-label="Subir">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" className={ICON_BTN} onClick={() => onChange(move(values, i, 1))} disabled={i === values.length - 1} aria-label="Bajar">
              <ArrowDown className="h-4 w-4" />
            </button>
            <button type="button" className={ICON_BTN} onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label="Quitar">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {errors[errorPrefix] && <p className="text-xs text-red-700">{errors[errorPrefix]}</p>}
        <button type="button" className={SMALL_BTN} onClick={() => onChange([...values, ""])}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> {addLabel}
        </button>
      </div>
    </div>
  );
}

function LinkList({ label, values, max, onChange }: { label: string; values: Link_[]; max: number; onChange: (v: Link_[]) => void }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="space-y-2">
        {values.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-start gap-1">
            <input value={l.label} placeholder="Texto" onChange={(e) => onChange(values.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={INPUT} aria-label={`${label} ${i + 1}: texto`} />
            <input value={l.href} placeholder="/aircraft o https://…" onChange={(e) => onChange(values.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} className={INPUT} aria-label={`${label} ${i + 1}: destino`} />
            <button type="button" className={ICON_BTN} onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label="Quitar link">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {values.length < max && (
          <button type="button" className={SMALL_BTN} onClick={() => onChange([...values, { label: "", href: "" }])}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar link
          </button>
        )}
      </div>
    </div>
  );
}

export function GuideEditor({ guideId, initial }: { guideId?: string; initial: GuideEditorValues }) {
  const router = useRouter();
  const [v, setV] = useState<GuideEditorValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof GuideEditorValues>(k: K, val: GuideEditorValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const setSection = (i: number, patch: Partial<EditorSection>) =>
    set("sections", v.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  // Para guardar: sin renglones vacíos (un párrafo o viñeta en blanco no se guarda).
  const payload = () => ({
    ...v,
    sections: v.sections.map((s) => ({
      ...s,
      paragraphs: s.paragraphs.map((p) => p.trim()).filter(Boolean),
      bullets: s.bullets.map((b) => b.trim()).filter(Boolean),
      links: s.links.filter((l) => l.label.trim() || l.href.trim()),
    })),
    source: v.source && (v.source.label.trim() || v.source.href.trim()) ? v.source : null,
    cta: v.cta.filter((l) => l.label.trim() || l.href.trim()),
  });

  const save = () => {
    setMessage(null);
    const data = payload();
    const parsed = guideInputSchema.safeParse(data);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path.join(".")] ??= issue.message;
      setErrors(errs);
      setMessage({ ok: false, text: "Revisá los campos marcados." });
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await saveGuideAction({ ...parsed.data, id: guideId });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
        return;
      }
      setMessage({ ok: true, text: "Guardada." });
      if (!guideId) router.replace(`/admin/guides/${res.id}`);
      else router.refresh();
    });
  };

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-red-700">{errors[k]}</p>;
  const metaLen = v.metaDescription.trim().length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="max-w-4xl space-y-6"
      noValidate
    >
      <section className={PLATE}>
        <p className={EYEBROW}>Datos de la guía</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="g-title" className={LABEL}>Título</label>
            <input id="g-title" value={v.title} onChange={(e) => set("title", e.target.value)} className={INPUT} />
            {err("title")}
          </div>
          <div>
            <label htmlFor="g-slug" className={LABEL}>Slug (en inglés, minúsculas y guiones)</label>
            <input id="g-slug" value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} placeholder="buying-a-used-aircraft" className={`${INPUT} font-mono`} />
            <p className="mt-1 text-[11px] text-slate-500">/services/guides/{v.slug || "…"}</p>
            {err("slug")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="g-audience" className={LABEL}>Para</label>
              <select id="g-audience" value={v.audience} onChange={(e) => set("audience", e.target.value as GuideEditorValues["audience"])} className={INPUT}>
                <option value="comprador">Compradores</option>
                <option value="vendedor">Vendedores</option>
                <option value="todos">Todos</option>
              </select>
            </div>
            <div>
              <label htmlFor="g-icon" className={LABEL}>Ícono</label>
              <select id="g-icon" value={v.icon} onChange={(e) => set("icon", e.target.value)} className={INPUT}>
                {GUIDE_ICONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="g-excerpt" className={LABEL}>Resumen (se ve en el índice)</label>
            <textarea id="g-excerpt" rows={2} value={v.excerpt} onChange={(e) => set("excerpt", e.target.value)} className={INPUT} />
            {err("excerpt")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="g-meta" className={LABEL}>Descripción para Google</label>
            <textarea id="g-meta" rows={2} value={v.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} className={INPUT} />
            <p className={`mt-1 text-[11px] tabular-nums ${metaLen > META_MAX ? "font-semibold text-red-700" : "text-slate-500"}`}>
              {metaLen} / {META_MAX} caracteres
            </p>
            {err("metaDescription")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="g-order" className={LABEL}>Orden</label>
              <input id="g-order" inputMode="numeric" value={String(v.order)} onChange={(e) => set("order", Number(e.target.value.replace(/\D/g, "") || 0))} className={`${INPUT} tabular-nums`} />
              <p className="mt-1 text-[11px] text-slate-500">Menor, primero. La Home muestra las 4 primeras.</p>
            </div>
            <div>
              <label htmlFor="g-reviewed" className={LABEL}>Revisada por</label>
              <input id="g-reviewed" value={v.reviewedBy} onChange={(e) => set("reviewedBy", e.target.value)} placeholder="Opcional" className={INPUT} />
            </div>
          </div>
          <label className="flex items-start gap-3 self-center text-sm text-slate-800">
            <input type="checkbox" checked={v.isGlossary} onChange={(e) => set("isGlossary", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#001F58]" />
            <span>
              Es un glosario
              <span className="block text-xs text-slate-500">Cada sección es un término (con su ancla) y se publica como DefinedTermSet.</span>
            </span>
          </label>
        </div>
      </section>

      <section className={PLATE}>
        <div className="flex items-center justify-between">
          <p className={EYEBROW}>Secciones ({v.sections.length})</p>
          {err("sections")}
        </div>
        <ol className="space-y-4">
          {v.sections.map((s, i) => (
            <li key={i} className="rounded-md border border-[#001F58]/12 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-bold tabular-nums text-[#C20D1A]">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex items-center">
                  <button type="button" className={ICON_BTN} onClick={() => set("sections", move(v.sections, i, -1))} disabled={i === 0} aria-label={`Subir sección ${i + 1}`}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" className={ICON_BTN} onClick={() => set("sections", move(v.sections, i, 1))} disabled={i === v.sections.length - 1} aria-label={`Bajar sección ${i + 1}`}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" className={`${SMALL_BTN} text-red-700`} onClick={() => set("sections", v.sections.filter((_, j) => j !== i))}>
                    Quitar sección
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                <div>
                  <label htmlFor={`s-${i}-h`} className={LABEL}>Título de la sección</label>
                  <input id={`s-${i}-h`} value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} className={INPUT} />
                  {err(`sections.${i}.heading`)}
                </div>
                <div>
                  <label htmlFor={`s-${i}-id`} className={LABEL}>Ancla (opcional)</label>
                  <input id={`s-${i}-id`} value={s.id} onChange={(e) => setSection(i, { id: e.target.value.toLowerCase() })} placeholder="smoh" className={`${INPUT} font-mono`} />
                  {err(`sections.${i}.id`)}
                </div>
              </div>
              <div className="mt-3 space-y-3">
                <StringList label="Párrafos" addLabel="Agregar párrafo" multiline values={s.paragraphs} onChange={(p) => setSection(i, { paragraphs: p })} errorPrefix={`sections.${i}.paragraphs`} errors={errors} />
                <StringList label="Viñetas" addLabel="Agregar viñeta" values={s.bullets} onChange={(b) => setSection(i, { bullets: b })} errorPrefix={`sections.${i}.bullets`} errors={errors} />
                <LinkList label="Links al pie de la sección" values={s.links} max={6} onChange={(l) => setSection(i, { links: l })} />
                {Object.keys(errors).some((k) => k.startsWith(`sections.${i}.links`)) && <p className="text-xs text-red-700">Revisá los links de esta sección.</p>}
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className={SMALL_BTN} onClick={() => set("sections", [...v.sections, emptySection()])}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar sección
        </button>
      </section>

      <section className={PLATE}>
        <p className={EYEBROW}>Fuente oficial y botones</p>
        <div>
          <span className={LABEL}>Fuente oficial (se muestra arriba, con link visible)</span>
          <div className="grid gap-1 sm:grid-cols-[1fr_1fr]">
            <input
              value={v.source?.label ?? ""}
              placeholder="ANAC, …"
              onChange={(e) => set("source", { label: e.target.value, href: v.source?.href ?? "" })}
              className={INPUT}
              aria-label="Fuente: texto"
            />
            <input
              value={v.source?.href ?? ""}
              placeholder="https://www.argentina.gob.ar/…"
              onChange={(e) => set("source", { label: v.source?.label ?? "", href: e.target.value })}
              className={INPUT}
              aria-label="Fuente: link"
            />
          </div>
          {(errors["source.href"] || errors["source.label"]) && <p className="mt-1 text-xs text-red-700">{errors["source.href"] ?? errors["source.label"]}</p>}
        </div>
        <LinkList label="Botones al pie (el primero va en rojo)" values={v.cta} max={3} onChange={(c) => set("cta", c)} />
        {Object.keys(errors).some((k) => k.startsWith("cta")) && <p className="text-xs text-red-700">Revisá los botones.</p>}
        <p className="text-xs text-slate-500">El aviso legal estándar de las guías se agrega solo al pie.</p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 items-center rounded-md bg-[#001F58] px-5 text-xs font-bold text-white hover:bg-[#00133A] disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Guardando…" : guideId ? "Guardar cambios" : "Crear borrador"}
        </button>
        {guideId && (
          <Link href={`/admin/guides/${guideId}/preview`} className="rounded-md border border-[#001F58]/20 px-4 py-2 text-xs font-semibold text-[#001F58] hover:bg-slate-50">
            Vista previa
          </Link>
        )}
        <Link href="/admin/guides" className="rounded-md px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
          Volver
        </Link>
        {message && <span className={`text-xs font-medium ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</span>}
      </div>
      {guideId && <p className="text-xs text-slate-500">La vista previa muestra lo guardado: guardá antes de verla.</p>}
    </form>
  );
}
