// Datos clave del resumen del detalle (VA-41): grilla de 2 columnas, label arriba y valor abajo.
export type KeyFact = { label: string; value: string | null | undefined };

export function KeyFacts({ title, facts }: { title?: string; facts: KeyFact[] }) {
  const kept = facts.filter((f): f is { label: string; value: string } => !!f.value);
  if (kept.length === 0) return null;
  return (
    <div className="space-y-2">
      {title && <h2 className="font-bold text-[#001F58] text-sm">{title}</h2>}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {kept.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-xs font-semibold text-slate-500">{f.label}</dt>
            <dd className="text-slate-800 font-medium break-words">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
