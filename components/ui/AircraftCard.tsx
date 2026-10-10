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
import { errorMessage } from "@/lib/errors";
import { useFavoriteIds } from "@/components/ui/FavoriteIdsProvider";



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

  const specs = [
    categoryFormatted,
    year,
    totalTimeHours != null ? `${totalTimeHours.toLocaleString("es-AR")} hs` : "Horas no informadas",
  ].filter(Boolean);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loadingFav) return;

    const nextState = !isFavorite;
    setIsFavorite(nextState);
    setLoadingFav(true);

    try {
      const res = await toggleFavoriteAction(id, "AIRCRAFT");
      setIsFavorite(res.isFavorite);

      if (onFavoriteToggle) {
        onFavoriteToggle(id, res.isFavorite);
      }
    } catch (error) {
      setIsFavorite(!nextState);
      if (errorMessage(error) === "UNAUTHENTICATED") {
        router.push("/login");
      }
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

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/planes/plane-details/${id}` : "";

  return (
    <>
      <Link href={`/planes/plane-details/${id}`} className="group block h-full">
        <Card data-card className="h-full flex flex-col p-3 rounded-lg bg-[#FFFFFF]/[0.65] border border-[#001F58]/10 hover:border-[#001F58]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
            <ImageCarousel
              images={images}
              fallbackImage={imageUrl}
              alt={title}
            />

            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShareClick}
                aria-label="Compartir"
                className="p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleFavoriteClick}
                disabled={loadingFav}
                aria-label="Añadir a favoritos"
                className={`p-2 rounded-full backdrop-blur-md shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                  isFavorite
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-white/80 text-slate-700 hover:text-red-600 hover:bg-white"
                }`}
              >
                {loadingFav ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                ) : (
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      isFavorite ? "fill-red-600 text-red-600" : ""
                    }`}
                  />
                )}
              </button>
            </div>
          </div>

          <CardContent className="p-3 pt-4 flex flex-col flex-1 justify-between gap-4">
            <div className="space-y-1">
              <h3
                className="font-heading font-semibold text-base text-[#001F58] line-clamp-1 group-hover:text-primary transition-colors"
                title={title}
              >
                {title}
              </h3>

              {specs.length > 0 && (
                <p className="text-xs text-muted-foreground line-clamp-1 capitalize">
                  {specs.map((item, index) => (
                    <span key={index}>
                      {item}
                      {index < specs.length - 1 && (
                        <span className="mx-1.5 text-muted-foreground/40 font-bold">
                          ·
                        </span>
                      )}
                    </span>
                  ))}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <p className="text-lg font-heading font-bold text-primary tracking-tight">
                {formattedPrice}
              </p>

              {locationText && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="line-clamp-1" title={locationText}>
                    {locationText}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      <ShareDialog open={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} url={shareUrl} title={title} />
    </>
  );
}