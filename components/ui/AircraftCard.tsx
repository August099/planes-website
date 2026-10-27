"use client";

import { useState } from "react";
import { ShareDialog } from "@/components/ui/ShareDialog";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Heart,
  Share2,
  Loader2,
} from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/favorite-actions";
import { useRouter } from "next/navigation";
import { ImageCarousel } from "./CardImageCarousel";
import { formatPrice } from "@/lib/format";
import { useFavoriteIds } from "@/components/ui/FavoriteIdsProvider";
import { CompareButton } from "@/components/ui/compare/CompareButton";



type CategoryProp = { id?: string; name: string } | string | null;

type AircraftImage = {
  id: string;
  aircraftId: string;
  order: number;
  url: string;
};

type AircraftCardProps = {
  id: string;
  title: string;
  price: { toNumber?: () => number } | number | string | null;
  year: number | null;
  category?: CategoryProp;
  totalTimeHours: number | null;
  city?: string | null;
  province?: string | null;

  imageUrl: string;
  images?: AircraftImage[];

  isFavoriteInitial?: boolean;
  onFavoriteToggle?: (id: string, isFav: boolean) => void;
};

export function AircraftCard({
  id,
  title,
  price,
  year,
  category,
  totalTimeHours,
  city,
  province,
  imageUrl,
  images = [],
  isFavoriteInitial = false,
  onFavoriteToggle,
}: AircraftCardProps) {
  // VA-76: en páginas estáticas (la Home) el favorito llega después, desde FavoriteIdsProvider;
  // lo que el usuario toca en la card manda sobre eso.
  const favoriteIds = useFavoriteIds();
  const [favoriteOverride, setIsFavorite] = useState<boolean | null>(null);
  const isFavorite = favoriteOverride ?? (isFavoriteInitial || !!favoriteIds?.aircraft.includes(id));
  const [loadingFav, setLoadingFav] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const router = useRouter();

  const formattedPrice = formatPrice(price, { fallback: "Consultar" });

  const locationText = [city, province].filter(Boolean).join(", ");

  const categoryName =
    typeof category === "object" && category !== null
      ? category.name
      : category;

  const categoryFormatted = categoryName
    ? categoryName.replace(/_/g, " ")
    : null;

  // Rediseño (25/10): los mismos tres datos de antes (categoría, año y horas), en la cinta de la tarjeta.
  const tape = [
    { label: "Categoría", value: categoryFormatted },
    { label: "Año", value: year != null ? String(year) : null },
    { label: "Horas", value: totalTimeHours != null ? `${totalTimeHours.toLocaleString("es-AR")} hs` : "Sin dato" },
  ].filter((cell): cell is { label: string; value: string } => !!cell.value);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loadingFav) return;

    const nextState = !isFavorite;
    setIsFavorite(nextState);
    setLoadingFav(true);

    try {
      const res = await toggleFavoriteAction(id, "AIRCRAFT");
      if (res.needsLogin) {
        setIsFavorite(!nextState);
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setIsFavorite(res.isFavorite);

      if (onFavoriteToggle) {
        onFavoriteToggle(id, res.isFavorite);
      }
    } catch {
      setIsFavorite(!nextState);
    } finally {
      setLoadingFav(false);
    }
  };

  // Compartir: siempre la ventana flotante, en celular y en escritorio (pedido del socio, 9/10).
  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/aircraft/${id}` : "";

  return (
    <>
      <Link href={`/aircraft/${id}`} className="group block h-full">
        <Card data-card className="va-card h-full flex flex-col gap-0 p-0">
          <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100">
            <ImageCarousel
              images={images}
              fallbackImage={imageUrl}
              alt={title}
            />

            {/* VA-83: agregar a la comparación (no compite con favoritos, que va arriba). */}
            <div className="absolute bottom-2.5 left-2.5 z-30">
              <CompareButton item={{ id, title, image: images[0]?.url ?? imageUrl ?? null }} />
            </div>

            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShareClick}
                aria-label="Compartir"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm text-[#00205B] transition-colors hover:bg-white hover:text-[#D62828] cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleFavoriteClick}
                disabled={loadingFav}
                aria-label="Añadir a favoritos"
                className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${
                  isFavorite ? "bg-white text-[#D62828]" : "bg-white/95 text-[#00205B] hover:bg-white hover:text-[#D62828]"
                }`}
              >
                {loadingFav ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#D62828]" />
                ) : (
                  <Heart className={`w-4 h-4 transition-colors ${isFavorite ? "fill-[#D62828] text-[#D62828]" : ""}`} />
                )}
              </button>
            </div>
          </div>

          <CardContent className="flex flex-1 flex-col gap-3 p-0">
            <h3 className="px-4 pt-3.5 font-heading text-[15px] font-bold leading-snug text-[#00205B] line-clamp-1" title={title}>
              {title}
            </h3>

            {tape.length > 0 && (
              <dl className="va-tape">
                {tape.map((cell) => (
                  <div key={cell.label} className="min-w-0 px-4 py-2">
                    <dt className="va-label">{cell.label}</dt>
                    <dd className="truncate text-[13px] font-semibold text-[#00205B] tabular-nums capitalize" title={cell.value}>
                      {cell.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-auto flex items-end justify-between gap-3 px-4 pb-4">
              <p className="shrink-0 whitespace-nowrap font-heading text-lg font-extrabold tracking-[-0.01em] text-[#00205B] tabular-nums">{formattedPrice}</p>
              {locationText && (
                <p className="flex min-w-0 items-center gap-1 text-xs text-slate-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#D62828]" aria-hidden />
                  <span className="truncate" title={locationText}>
                    {locationText}
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      <ShareDialog open={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} url={shareUrl} title={title} />
    </>
  );
}