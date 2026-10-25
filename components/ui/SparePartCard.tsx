"use client";

import { useState } from "react";
import { ShareDialog } from "@/components/ui/ShareDialog";
import { AppImage } from "@/components/ui/AppImage";
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
import { formatPrice } from "@/lib/format";
import { formatEnum, SPARE_PART_CONDITION_LABELS } from "@/lib/constants";
import { useFavoriteIds } from "@/components/ui/FavoriteIdsProvider";



type SparePartCardProps = {
  id: string;
  title: string;
  price: number | null;
  inPesos?: boolean;
  category: { name: string } | string | null;
  condition?: string | null;
  brand?: string | null;
  model?: string | null;
  city?: string | null;
  province?: string | null;
  imageUrl: string;
  isFavoriteInitial?: boolean;
  onFavoriteToggle?: (id: string, isFav: boolean) => void;
};

export function SparePartCard({
  id,
  title,
  price,
  inPesos = false,
  category,
  condition,
  brand,
  model,
  city,
  province,
  imageUrl,
  isFavoriteInitial = false,
  onFavoriteToggle,
}: SparePartCardProps) {
  // VA-76: en páginas estáticas (la Home) el favorito llega después, desde FavoriteIdsProvider;
  // lo que el usuario toca en la card manda sobre eso.
  const favoriteIds = useFavoriteIds();
  const [favoriteOverride, setIsFavorite] = useState<boolean | null>(null);
  const isFavorite = favoriteOverride ?? (isFavoriteInitial || !!favoriteIds?.spareParts.includes(id));
  const [loadingFav, setLoadingFav] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const router = useRouter();

  const formattedPrice = formatPrice(price, { inPesos, fallback: "Consultar" });

  const locationText = [city, province].filter(Boolean).join(", ");
  const categoryLabel = typeof category === "object" && category !== null ? category.name : category;
  const formattedCondition = condition ? formatEnum(condition, SPARE_PART_CONDITION_LABELS) : null;
  const brandAndModel = [brand, model].filter(Boolean).join(" ");
  // Rediseño (25/10): los mismos datos de antes (categoría y marca/modelo), en la cinta de la tarjeta.
  const tape = [
    { label: "Categoría", value: categoryLabel },
    { label: "Marca / modelo", value: brandAndModel || null },
  ].filter((cell): cell is { label: string; value: string } => !!cell.value);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loadingFav) return;

    const nextState = !isFavorite;
    setIsFavorite(nextState);
    setLoadingFav(true);

    try {
      const res = await toggleFavoriteAction(id, "SPARE_PART");
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

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/spareparts/sparepart-details/${id}` : "";

  return (
    <>
      <Link href={`/spareparts/sparepart-details/${id}`} className="group block h-full">
        <Card data-card className="va-card h-full flex flex-col gap-0 p-0 rounded-md">
          <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100">
            <AppImage
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />

            {formattedCondition && (
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="rounded-sm bg-[#00205B] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                  {formattedCondition}
                </span>
              </div>
            )}

            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShareClick}
                aria-label="Compartir"
                className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-white/95 text-[#00205B] transition-colors hover:bg-white hover:text-[#D62828] cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleFavoriteClick}
                disabled={loadingFav}
                aria-label="Añadir a favoritos"
                className={`flex h-9 w-9 items-center justify-center rounded-[4px] transition-colors cursor-pointer disabled:opacity-50 ${
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
                    <dd className="truncate text-[13px] font-semibold text-[#00205B] capitalize" title={cell.value}>
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