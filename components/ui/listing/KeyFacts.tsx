// Datos clave del resumen del detalle (VA-41): grilla de 2 columnas, label arriba y valor abajo.
// Rediseño (25/10): celdas con líneas finas, como la ficha técnica de un instrumento; números tabulares.
export type KeyFact = { label: string; value: string | null | undefined };

export function KeyFacts({ title, facts }: { title?: string; facts: KeyFact[] }) {
  const kept = facts.filter((f): f is { label: string; value: string } => !!f.value);
  if (kept.length === 0) return null;
  return (
    <div className="space-y-2">
      {title && <h2 className="va-label">{title}</h2>}
      <dl className="grid grid-cols-2 border-t border-l border-[#00205B]/10">
        {kept.map((f) => (
          <div key={f.label} className="min-w-0 border-r border-b border-[#00205B]/10 px-3 py-2.5">
            <dt className="text-[11px] font-semibold text-slate-500">{f.label}</dt>
            <dd className="font-semibold text-[#00205B] break-words tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
