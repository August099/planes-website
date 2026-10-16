"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Ruler, Share2 } from "lucide-react";
import type { HangarRentPeriod, HangarRentalType, ListingCurrency } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { ShareDialog } from "@/components/ui/ShareDialog";
import { ImageCarousel } from "./CardImageCarousel";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import { doorText, hangarPath, hangarPrices, offerLabel } from "@/lib/hangars";

// VA-84: tarjeta de hangar, con el mismo diseño que las de aeronave y repuesto (foto, título,
// datos, precio y ubicación). Lo único distinto es el bloque de precio: venta grande y alquiler
// más chico abajo, con su período, si publica los dos (pedido del socio, 11/10).
// Favoritos: se suma cuando se integren con los hangares (pendiente de la orden del socio).

export type HangarCardData = {
  id: string;
  title: string;
  airfieldName: string;
  city: string;
  province: string;
  doorWidth: number;
  doorHeight: number;
  offersSale: boolean;
  salePrice: number | null;
  saleCurrency: ListingCurrency;
  offersRent: boolean;
  rentalType: HangarRentalType | null;
  rentPrice: number | null;
  rentCurrency: ListingCurrency;
  rentPeriod: HangarRentPeriod | null;
  images: { id: string; url: string; order: number }[];
};

export function HangarCard({ hangar }: { hangar: HangarCardData }) {
  const [shareOpen, setShareOpen] = useState(false);
  const prices = hangarPrices(hangar);
  const location = [hangar.city, hangar.province].filter(Boolean).join(", ");
  const href = hangarPath(hangar.id);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${href}` : href;

  return (
    <>
      <Link href={href} className="group block h-full">
        <Card data-card className="h-full flex flex-col p-3 rounded-lg bg-[#FFFFFF]/[0.65] border border-[#001F58]/10 hover:border-[#001F58]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
            <ImageCarousel images={hangar.images} fallbackImage={PLACEHOLDER_IMAGE} alt={hangar.title} />
            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShareOpen(true);
                }}
                aria-label="Compartir"
                className="p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <CardContent className="p-3 pt-4 flex flex-col flex-1 justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-heading font-semibold text-base text-[#001F58] line-clamp-1 group-hover:text-primary transition-colors" title={hangar.title}>
                {hangar.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{offerLabel(hangar)}</p>
              <p className="flex items-center gap-1 text-xs font-medium text-slate-700 tabular-nums">
                <Ruler className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" aria-hidden />
                {doorText(hangar.doorWidth, hangar.doorHeight)}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-lg font-heading font-bold text-primary tracking-tight tabular-nums">
                {prices.main.amount}
                {prices.main.suffix && <span className="ml-1 text-xs font-semibold text-muted-foreground">{prices.main.suffix}</span>}
              </p>
              {prices.secondary && (
                <p className="text-xs font-semibold text-slate-700 tabular-nums">
                  {prices.secondary.label}: {prices.secondary.amount}
                  {prices.secondary.period && <span className="font-normal text-muted-foreground"> {prices.secondary.period}</span>}
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <span className="line-clamp-1" title={`${hangar.airfieldName} · ${location}`}>
                  {hangar.airfieldName} · {location}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} url={shareUrl} title={hangar.title} />
    </>
  );
}
