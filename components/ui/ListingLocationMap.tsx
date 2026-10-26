import { ZoneMapEnhancer } from "@/components/ui/ZoneMapEnhancer";

// VA-83 / VA-129 / VA-156: mapa de zona aproximada de un aviso. Usa el mapa real (ZoneMapEnhancer:
// MapLibre + OpenFreeMap, cargado al entrar en pantalla). Las coordenadas son las del centro de la
// localidad, nunca un punto exacto. Componente de servidor.

type Props = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  city?: string | null;
  province?: string | null;
  /** Rótulo del bloque. */
  title?: string;
  className?: string;
};

export function ListingLocationMap({ latitude, longitude, city, province, title = "Zona", className = "" }: Props) {
  // Sin coordenadas no hay mapa.
  if (latitude == null || longitude == null) return null;

  const place = [city, province].filter(Boolean).join(", ");
  const label = `Mapa de la zona aproximada${place ? `: ${place}` : ""}`;

  return (
    <section className={`overflow-hidden rounded-lg border border-[#00205B]/12 bg-white ${className}`}>
      <p className="border-b border-[#00205B]/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="relative h-[220px] bg-[#F3F7FB] sm:h-[260px]">
        <ZoneMapEnhancer latitude={latitude} longitude={longitude} label={label} />
      </div>
      {place && <p className="border-t border-[#00205B]/10 px-4 py-3 text-sm text-slate-600">Ubicación aproximada: {place}</p>}
    </section>
  );
}