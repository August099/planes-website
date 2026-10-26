// Datos clave del resumen del detalle (VA-41): grilla de 2 columnas, label arriba y valor abajo.
// Rediseño (25/10): celdas con líneas finas, como la ficha técnica de un instrumento; números tabulares.
export type KeyFact = { label: string; value: string | null | undefined };

export function KeyFacts({ title, facts }: { title?: string; facts: KeyFact[] }) {
  const kept = facts.filter((f): f is { label: string; value: string } => !!f.value);
  if (kept.length === 0) return null;
  return (
    <div className="space-y-2">
      {title && <h2 className="va-label">{title}</h2>}
      {/* Rediseño (26/10): grilla redondeada; las líneas son el fondo que asoma entre celdas (gap de 1 px). */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#00205B]/10 bg-[#00205B]/10 [&>*:last-child:nth-child(odd)]:col-span-2">
        {kept.map((f) => (
          <div key={f.label} className="min-w-0 bg-white px-3.5 py-3">
            <dt className="text-[11px] font-semibold text-slate-500">{f.label}</dt>
            <dd className="font-semibold text-[#00205B] break-words tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
