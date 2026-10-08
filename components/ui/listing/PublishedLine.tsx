import { MapPin } from "lucide-react";

// "Publicado el … · 📍 Ciudad, Provincia" en una línea (VA-57). En celular, si no entra,
// la ubicación pasa a la línea de abajo sin cortarse.
export function PublishedLine({ createdAt, location }: { createdAt: Date; location?: string | null }) {
  const date = createdAt.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 pb-2 border-b border-slate-100">
      <span>Publicado el {date}</span>
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
