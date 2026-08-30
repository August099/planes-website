"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Heart, Share2, Loader2 } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/favorite-actions";
import { useRouter } from "next/navigation";

type CategoryProp = { id?: string; name: string } | string | null;

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
  isFavoriteInitial = false,
  onFavoriteToggle,
}: AircraftCardProps) {
  const [isFavorite, setIsFavorite] = useState(isFavoriteInitial);
  const [loadingFav, setLoadingFav] = useState(false);
  const router = useRouter();


  const numericPrice =
    price !== null && price !== undefined ? Number(price) : NaN;
  const formattedPrice =
    !isNaN(numericPrice) && numericPrice > 0
      ? new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(numericPrice)
      : "Consultar";

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
    totalTimeHours ? `${totalTimeHours.toLocaleString()} hs` : null,
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
    } catch (error: any) {
      setIsFavorite(!nextState);
      if (error.message === "UNAUTHENTICATED") {
        router.push("/login");
      }
    } finally {
      setLoadingFav(false);
    }
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = `${window.location.origin}/planes/plane-details/${id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: shareUrl,
        });
      } catch (error) {
        // Cancelado por el usuario
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("¡Enlace copiado al portapapeles!");
    }
  };

  return (
    <Link href={`/planes/plane-details/${id}`} className="group block h-full">
      <Card className="h-full flex flex-col p-3 rounded-lg bg-[#FFFFFF]/[0.65] border border-[#001F58]/10 hover:border-[#001F58]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShareClick}
              aria-label="Compartir"
              className="p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white shadow-sm transition-all duration-200 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleFavoriteClick}
              disabled={loadingFav}
              aria-label="Añadir a favoritos"
              className="p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-700 hover:text-red-600 hover:bg-white shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
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
  );
}