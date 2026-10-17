import { ARGENTINA_VIEWBOX, PROVINCE_PATHS } from "@/components/ui/argentina-map/paths";
import { projectToMap, provinceBBox, type BBox } from "@/lib/argentina-map";
import { PROVINCES, provinceByName } from "@/lib/provinces";

// VA-83 / VA-129: mapa de zona aproximada de un aviso (y, más adelante, de hangares y pistas).
// Es el mismo mapa de provincias de la Home (SVG propio, sin teselas de terceros ni costo): se
// encuadra la provincia del aviso, se resalta y se marca la localidad con un punto. Nunca muestra un
// punto exacto: las coordenadas son las del centro de la localidad. Componente de servidor, sin JS.

type Props = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  city?: string | null;
  province?: string | null;
  /** Rótulo del bloque. */
  title?: string;
  className?: string;
};

// Proporción del encuadre (ancho / alto), parecida a la del bloque en celular y escritorio.
const VIEW_ASPECT = 1.6;
// Lado mínimo del encuadre, en unidades del SVG (~110 km): CABA y provincias chicas no quedan ampliadas de más.
const MIN_SIDE = 20;
// Centro de CABA, para encuadrarla cuando el aviso no tiene coordenadas.
const CABA_CENTER = { lon: -58.44, lat: -34.61 };

function frame(box: BBox): { x: number; y: number; w: number; h: number } {
  const pad = Math.max(box.maxX - box.minX, box.maxY - box.minY) * 0.12 + 4;
  let w = Math.max(box.maxX - box.minX + pad * 2, MIN_SIDE);
  let h = Math.max(box.maxY - box.minY + pad * 2, MIN_SIDE);
  if (w / h < VIEW_ASPECT) w = h * VIEW_ASPECT;
  else h = w / VIEW_ASPECT;
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function ListingLocationMap({ latitude, longitude, city, province, title = "Zona", className = "" }: Props) {
  const slug = provinceByName(province)?.slug ?? null;
  // VA-138: sin coordenadas (avisos viejos o si Georef no respondió al publicar) igual se muestra la
  // provincia resaltada, sin el punto. Sin coordenadas ni provincia conocida, no hay mapa.
  const point = latitude != null && longitude != null ? projectToMap(longitude, latitude) : null;
  const center = point ?? (slug === "caba" ? projectToMap(CABA_CENTER.lon, CABA_CENTER.lat) : null);
  const base = (slug && slug !== "caba" ? provinceBBox(slug) : null) ?? (center ? { minX: center.x, minY: center.y, maxX: center.x, maxY: center.y } : null);
  if (!base) return null;
  const place = [city, province].filter(Boolean).join(", ");

  // Encuadre: la provincia del aviso (CABA se ve dentro de su zona), siempre incluyendo el punto.
  const view = frame(
    point
      ? {
          minX: Math.min(base.minX, point.x),
          minY: Math.min(base.minY, point.y),
          maxX: Math.max(base.maxX, point.x),
          maxY: Math.max(base.maxY, point.y),
        }
      : base
  );
  const dot = view.w * 0.012;
  const label = `Mapa de la zona aproximada${place ? `: ${place}` : ""}`;

  return (
    <section className={`overflow-hidden rounded-lg border border-[#001F58]/12 bg-white ${className}`}>
      <p className="border-b border-[#001F58]/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="relative h-[220px] bg-[#F3F7FB] sm:h-[260px]">
        <svg
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          role="img"
          aria-label={label}
        >
          {PROVINCES.filter((p) => PROVINCE_PATHS[p.slug]).map((p) => (
            <path
              key={p.slug}
              d={PROVINCE_PATHS[p.slug]}
              className={p.slug === slug ? "fill-[#CFE3F6] stroke-[#0A4C96]/50" : "fill-[#E4EBF3] stroke-white"}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {point && (
            <>
              <circle cx={point.x} cy={point.y} r={dot * 3} className="fill-[#E70F1F]/15" />
              <circle cx={point.x} cy={point.y} r={dot} className="fill-[#E70F1F] stroke-white" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>

        {/* Ubicación de la provincia en el país (decorativo: la zona ya está dicha en el pie). */}
        <svg
          viewBox={ARGENTINA_VIEWBOX}
          aria-hidden
          className="absolute bottom-2 right-2 h-[38%] w-auto rounded-md border border-[#001F58]/10 bg-white/85 p-1"
        >
          {PROVINCES.filter((p) => PROVINCE_PATHS[p.slug]).map((p) => (
            <path
              key={p.slug}
              d={PROVINCE_PATHS[p.slug]}
              className={p.slug === slug ? "fill-[#0A4C96]" : "fill-[#CFE3F6]"}
            />
          ))}
          <rect
            x={view.x}
            y={view.y}
            width={view.w}
            height={view.h}
            className="fill-none stroke-[#E70F1F]"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {place && <p className="border-t border-[#001F58]/10 px-4 py-3 text-sm text-slate-600">Ubicación aproximada: {place}</p>}
    </section>
  );
}
