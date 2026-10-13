"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// VA-83: mapa de zona aproximada de un aviso (y, más adelante, de hangares y pistas).
// Leaflet pesa: se descarga con import dinámico recién cuando el bloque entra en pantalla
// (IntersectionObserver). Hasta entonces hay un placeholder del mismo alto, así no salta el layout.
// Muestra un círculo de ~5 km en el centro de la localidad, nunca un punto exacto.

const ZoneMap = dynamic(() => import("@/components/ui/LeafletZoneMap"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  return <div aria-hidden className="h-full w-full bg-[#E8EEF5]" />;
}

type Props = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  city?: string | null;
  province?: string | null;
  /** Radio de la zona en metros (5 km por defecto). */
  radius?: number;
  /** Rótulo del bloque. */
  title?: string;
  className?: string;
};

export function ListingLocationMap({ latitude, longitude, city, province, radius = 5000, title = "Zona", className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  if (latitude == null || longitude == null) return null;
  const place = [city, province].filter(Boolean).join(", ");

  return (
    <section className={`overflow-hidden rounded-lg border border-[#001F58]/12 bg-white ${className}`}>
      <p className="border-b border-[#001F58]/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div ref={ref} className="relative isolate z-0 h-[220px] sm:h-[260px]">
        {visible ? <ZoneMap lat={latitude} lon={longitude} radius={radius} /> : <MapPlaceholder />}
      </div>
      {place && <p className="border-t border-[#001F58]/10 px-4 py-3 text-sm text-slate-600">Ubicación aproximada: {place}</p>}
    </section>
  );
}
