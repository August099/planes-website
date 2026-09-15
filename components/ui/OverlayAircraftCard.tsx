"use client";

import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";

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

  const numericPrice =
    price !== null && price !== undefined ? Number(price) : NaN;
  const formattedPrice =
    !isNaN(numericPrice) && numericPrice > 0
      ? `$${new Intl.NumberFormat("es-AR", {
          maximumFractionDigits: 0,
        }).format(numericPrice)}`
      : "Consultar";

  return (
    <Link href={`/planes/plane-details/${id}`} className="group block h-full">
      <Card className="relative w-full aspect-[4/3] sm:aspect-[16/11] overflow-hidden rounded-2xl border-0 shadow-lg group-hover:shadow-2xl transition-all duration-300 bg-slate-900">
        {/* BADGE DESTACADO */}
        {featuredBadge && (
          <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-red-600 text-white text-[11px] font-bold rounded-lg shadow-md uppercase tracking-wide">
            {featuredBadge}
          </div>
        )}

        {/* IMAGEN CON ZOOM EN HOVER */}
        <Image
          src={imageUrl}
          alt={displayTitle}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* GRADIENTE INFERIOR PARA LECTURA DEL TEXTO */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

        {/* MARCA + MODELO CENTRADO Y MÁS ARRIBA */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 z-10 flex flex-col justify-end text-white">
          <h3
            className="font-bold text-xl sm:text-2xl text-white drop-shadow-md line-clamp-1 tracking-tight text-center mb-3"
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-lg sm:text-xl text-white/95 drop-shadow-sm">
              {formattedPrice}
            </span>
            {year && (
              <span className="font-semibold text-base sm:text-lg text-white/90 drop-shadow-sm">
                {year}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}