"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Heart, 
  Share2, 
  Wrench, 
  Radio, 
  Cog, 
  Shield, 
  SprayCan, 
  Fan, 
  Zap, 
  Armchair, 
  HelpCircle 
} from "lucide-react";

const SPARE_PART_CATEGORIES = [
  { id: "AVIONICS_RADIO", label: "Aviónica & Radios", icon: Radio },
  { id: "ENGINE", label: "Motor & Partes", icon: Cog },
  { id: "AIRFRAME", label: "Fuselaje & Estructura", icon: Shield },
  { id: "SPRAYING", label: "Equipo de Fumigación", icon: SprayCan },
  { id: "PROPELLER", label: "Hélices", icon: Fan },
  { id: "HARDWARE", label: "Herramental & Varios", icon: Wrench },
  { id: "ELECTRICAL", label: "Sistema Eléctrico & Luces", icon: Zap },
  { id: "INTERIOR", label: "Interior & Confort", icon: Armchair },
  { id: "OTHER", label: "Otros", icon: HelpCircle },
];

type SparePartCardProps = {
  id: string;
  title: string;
  price: number | null;
  category: string | null;
  condition: string | null;
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
  const [isFavorite, setIsFavorite] = useState(isFavoriteInitial);

  const categoryConfig = 
    SPARE_PART_CATEGORIES.find((item) => item.id === category) || 
    SPARE_PART_CATEGORIES.find((item) => item.id === "OTHER")!;

  const CategoryIcon = categoryConfig.icon;

  const formattedPrice = price
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(price)
    : "Consultar";

  const locationText = [city, province].filter(Boolean).join(", ");
  
  const categoryLabel = categoryConfig ? categoryConfig.label : category?.replace(/_/g, " ");
  const formattedCondition = condition ? condition.replace(/_/g, " ") : null;
  const brandAndModel = [brand, model].filter(Boolean).join(" ");

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    if (onFavoriteToggle) {
      onFavoriteToggle(id, nextState);
    }
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = `${window.location.origin}/sparepart-details/${id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: shareUrl,
        });
      } catch (error) {
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Enlace copiado al portapapeles");
    }
  };

  return (
    <Link href={`/sparepart-details/${id}`} className="group block h-full">
      <Card className="h-full flex flex-col p-3 rounded-2xl bg-[#001F58]/[0.02] border border-[#001F58]/10 hover:border-[#001F58]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {formattedCondition && (
            <div className="absolute top-2.5 left-2.5 z-10">
              <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm">
                {formattedCondition}
              </span>
            </div>
          )}

          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShareClick}
              aria-label="Compartir"
              className="p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white shadow-sm transition-all duration-200"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label="Añadir a favoritos"
              className="p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-700 hover:text-red-600 hover:bg-white shadow-sm transition-all duration-200"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFavorite ? "fill-red-600 text-red-600" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <CardContent className="p-3 pt-4 flex flex-col flex-1 justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-base text-[#001F58] line-clamp-1 group-hover:text-primary transition-colors mb-2" title={title}>
              {title}
            </h3>

            <div className="flex flex-wrap items-center gap-1.5">
              {categoryLabel && (
                <span className="text-xs font-semibold text-primary bg-sky-100/70 border-sky-200/60 px-2.5 py-0.5 rounded-md border flex items-center gap-1">
                  <CategoryIcon className="w-3 h-3 text-primary/70 shrink-0" />
                  {categoryLabel}
                </span>
              )}

              {brandAndModel && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded-md border border-[#001F58]/10 capitalize">
                  <Wrench className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                  {brandAndModel}
                </span>
              )}
            </div>
          </div>

          <div className="pt-2.5 border-t border-[#001F58]/10 flex flex-col items-start gap-1">
            <p className="text-lg font-heading font-bold text-primary tracking-tight text-left">
              {formattedPrice}
            </p>

            {locationText && (
              <div className="flex items-center justify-start gap-1 text-xs text-muted-foreground pt-0.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <span className="line-clamp-1 text-left" title={locationText}>
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