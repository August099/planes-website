"use client";

import { AppImage } from "@/components/ui/AppImage";
import { CompareButton } from "@/components/ui/compare/CompareButton";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";

type CategoryProp = { id?: string; name: string } | string | null;

export type AircraftCardProps = {
  id: string;
  title?: string;
  brand?: string | { name: string } | null;
  model?: string | { name: string } | null;
  price: { toNumber?: () => number } | number | string | null;
  year: number | null;
  category?: CategoryProp;
  totalTimeHours?: number | null;
  city?: string | null;
  province?: string | null;
  imageUrl: string;
  featuredBadge?: string;
};

export function OverlayAircraftCard({
  id,
  title = "",
  brand,
  model,
  price,
  year,
  imageUrl,
  featuredBadge,
}: AircraftCardProps) {
  // Extraer el nombre de la marca si viene como string u objeto
  const brandName =
    typeof brand === "object" && brand !== null ? brand.name : brand || "";

  // Extraer el nombre del modelo si viene como string u objeto
  const modelName =
    typeof model === "object" && model !== null ? model.name : model || "";

  // Construir el título combinando Marca y Modelo (o usar title de fallback si están vacíos)
  const displayTitle =
    brandName || modelName
      ? `${brandName} ${modelName}`.trim()
      : title || "Aeronave";

  const formattedPrice = formatPrice(price, { fallback: "Consultar" });

  return (
    <Link href={`/aircraft/${id}`} className="group block h-full">
      {/* Rediseño (25/10): la foto manda; abajo, un fundido al azul de marca (no negro) y los datos
          alineados a la izquierda con sus rótulos, como la placa de un instrumento. */}
      <Card className="va-card relative w-full aspect-[4/3] sm:aspect-[16/11] va-card-square bg-[#001331]">
        <div className="absolute top-3 right-3 z-10">
          <CompareButton variant="overlay" item={{ id, title: displayTitle, image: imageUrl ?? null }} />
        </div>
        {featuredBadge && (
          <div className="absolute top-3 left-3 z-10 rounded-sm bg-[#D62828] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
            {featuredBadge}
          </div>
        )}

        <AppImage
          src={imageUrl}
          alt={displayTitle}
          fill
          // VA-73: 1 card por fila en celular y 2 desde 640 px (FeaturedAircraftCarousel), dentro del container.
          sizes="(max-width: 640px) 100vw, (max-width: 1536px) 50vw, 768px"
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#001331]/90 via-[#00205B]/30 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-white sm:p-6">
          <h3 className="line-clamp-1 text-xl font-extrabold tracking-[-0.01em] text-white sm:text-[1.65rem]" title={displayTitle}>
            {displayTitle}
          </h3>
          <dl className="mt-3 flex items-end justify-between gap-4 border-t border-white/25 pt-3 tabular-nums">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">Precio</dt>
              <dd className="text-lg font-bold sm:text-xl">{formattedPrice}</dd>
            </div>
            {year != null && (
              <div className="text-right">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">Año</dt>
                <dd className="text-lg font-bold sm:text-xl">{year}</dd>
              </div>
            )}
          </dl>
        </div>
      </Card>
    </Link>
  );
}