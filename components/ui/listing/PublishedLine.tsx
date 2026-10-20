import { MapPin } from "lucide-react";

// "Publicado el … · 📍 Ciudad, Provincia" en una línea (VA-57). En celular, si no entra,
// la ubicación pasa a la línea de abajo sin cortarse. VA-167: si se republicó, también "Actualizado el …".
export function PublishedLine({ createdAt, lastPublishedAt, location }: { createdAt: Date; lastPublishedAt?: Date; location?: string | null }) {
  const fmt = (d: Date) => d.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  const date = fmt(createdAt);
  // Más de un minuto después del alta = republicado (el alta pone las dos fechas iguales).
  const updated = lastPublishedAt && lastPublishedAt.getTime() - createdAt.getTime() > 60_000 ? fmt(lastPublishedAt) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 pb-2 border-b border-slate-100">
      <span>Publicado el {date}</span>
      {updated && (
        <>
          <span aria-hidden>·</span>
          <span>Actualizado el {updated}</span>
        </>
      )}
      {location && (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <MapPin className="w-3.5 h-3.5" />
            {location}
          </span>
        </>
      )}
    </div>
  );
}
