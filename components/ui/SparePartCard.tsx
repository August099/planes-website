"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AppImage } from "@/components/ui/AppImage";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Heart, 
  Share2, 
  Loader2, 
  X, 
  Copy, 
  Check, 
  MessageCircle, 
  Mail 
} from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/favorite-actions";
import { useRouter } from "next/navigation";

// Iconos personalizados para el menú de compartir
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

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
  const [isFavorite, setIsFavorite] = useState(isFavoriteInitial);
  const [loadingFav, setLoadingFav] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedDesktop, setCopiedDesktop] = useState(false);
  const router = useRouter();

  const priceNumber = price !== null ? Number(price) : null;
  const numberFormatted = priceNumber !== null 
    ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(priceNumber)
    : null;

  const formattedPrice = numberFormatted
    ? `${inPesos ? "AR$" : "US$"} ${numberFormatted}`
    : "Consultar";

  const locationText = [city, province].filter(Boolean).join(", ");
  const categoryLabel = typeof category === "object" && category !== null ? category.name : category;
  const formattedCondition = condition ? condition.replace(/_/g, " ") : null;
  const brandAndModel = [brand, model].filter(Boolean).join(" ");
  const specs = [categoryLabel, brandAndModel].filter(Boolean);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loadingFav) return;

    const nextState = !isFavorite;
    setIsFavorite(nextState);
    setLoadingFav(true);

    try {
      const res = await toggleFavoriteAction(id, "SPARE_PART"); 
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

    const shareUrl = `${window.location.origin}/spareparts/sparepart-details/${id}`;
    const isMobile = window.innerWidth < 640;

    // 1. En Mobile: Usar Web Share API nativa si está disponible
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: shareUrl,
        });
        return;
      } catch (error) {
        return;
      }
    }

    // 2. En Mobile (sin Web Share API): desplegar menú flotante
    if (isMobile) {
      setIsShareModalOpen(true);
      return;
    }

    // 3. En Escritorio: Copiar enlace directamente sin abrir modal ni alertas
    await navigator.clipboard.writeText(shareUrl);
    setCopiedDesktop(true);
    setTimeout(() => setCopiedDesktop(false), 2000);
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/spareparts/sparepart-details/${id}` : "";
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const shareText = encodeURIComponent(`Mirá este repuesto en Ventas Aeronáuticas: ${title}`);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Link href={`/spareparts/sparepart-details/${id}`} className="group block h-full">
        <Card className="h-full flex flex-col p-3 rounded-lg bg-[#FFFFFF]/[0.65] border border-[#001F58]/10 hover:border-[#001F58]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
            <AppImage
              src={imageUrl}
              alt={title}
              fill
              optimizedWidth={600}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                title={copiedDesktop ? "¡Enlace copiado!" : "Compartir"}
                className="p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-700 hover:text-blue-600 hover:bg-white shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center"
              >
                {copiedDesktop ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
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
                        <span className="mx-1.5 text-muted-foreground/40 font-bold">·</span>
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

      {/* MODAL DE REDES SOCIALES PARA MOBILE (Renderizado en el Portal de React) */}
      {isShareModalOpen && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in duration-200"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsShareModalOpen(false);
          }}
        >
          <div 
            className="w-full bg-white rounded-t-3xl p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#001F58] text-base">Compartir repuesto</h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 py-2 text-center">
              <a
                href={`https://wa.me/?text=${shareText}%20${encodedShareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">WhatsApp</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FacebookIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">Facebook</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedShareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <TwitterIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">X (Twitter)</span>
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent(title)}&body=${shareText}%20${encodedShareUrl}`}
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">Email</span>
              </a>
            </div>

            <div className="pt-2">
              <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent px-2 text-xs text-slate-600 truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-[#001F58] hover:bg-blue-900 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}