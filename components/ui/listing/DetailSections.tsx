import { DetailRow } from "@/components/ui/DetailRow";
import type { DetailSection } from "@/lib/listing-detail";

// "Información adicional" (VA-57, maquetas 2–4): tablas una debajo de la otra, con el
// estilo de DetailRow. Las secciones ya vienen sin filas vacías (lib/listing-detail.ts).
export function DetailSections({ sections }: { sections: DetailSection[] }) {
  if (sections.length === 0) return null;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-[#001F58]">Información Adicional</h2>
      {sections.map((s) => (
        <div key={s.title} className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">{s.title}</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            {s.rows.map((row, i) => (
              <DetailRow
                key={row.label}
                label={row.label}
                last={i === s.rows.length - 1}
                multiline={!row.list}
                value={
                  row.list ? (
                    <ul className="list-disc pl-5 space-y-0.5">
                      {row.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    row.value
                  )
                }
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// Versión compacta para la vista de impresión (Ctrl+P) del detalle.
export function PrintSections({ sections }: { sections: DetailSection[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
      {sections.map((s) => (
        <div key={s.title} className="border border-slate-200 rounded-xl p-3 bg-white break-inside-avoid">
          <h3 className="text-xs font-bold uppercase text-[#001F58] border-b pb-1 mb-1.5 border-slate-100">{s.title}</h3>
          {s.rows.map((row) => (
            <p key={row.label} className="flex justify-between gap-3">
              <span className="font-semibold text-slate-500 shrink-0">{row.label}:</span>
              <span className="text-right whitespace-pre-line">{row.list ? row.list.join(", ") : row.value}</span>
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
