// VA-154: historial de moderación de un aviso (quién, cuándo y qué), para el admin.
export type HistoryItem = { action: "PAUSE" | "REVIEW_REQUESTED" | "REACTIVATE" | "KEEP_PAUSED"; message: string | null; at: string; admin: string | null };

const LABEL: Record<HistoryItem["action"], string> = {
  PAUSE: "Pausado",
  REVIEW_REQUESTED: "El dueño pidió revisión",
  REACTIVATE: "Reactivado",
  KEEP_PAUSED: "Se mantiene pausado",
};

const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

export function ModerationHistory({ items, compact = false }: { items: HistoryItem[]; compact?: boolean }) {
  return (
    <ol className={`${compact ? "mt-2" : ""} space-y-1 border-l border-[#001F58]/15 pl-3 text-[11px] text-slate-600`}>
      {items.map((h, i) => (
        <li key={i}>
          <span className="tabular-nums text-slate-400">{DATE.format(new Date(h.at))}</span> ·{" "}
          <span className="font-semibold text-[#001F58]">{LABEL[h.action]}</span>
          {h.admin && <span> por {h.admin}</span>}
          {h.message && <span className="block text-slate-700">“{h.message}”</span>}
        </li>
      ))}
    </ol>
  );
}
