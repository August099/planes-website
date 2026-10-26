"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Share2, Printer, TriangleAlert } from "lucide-react";
import { ShareDialog } from "@/components/ui/ShareDialog";
import { CompareButton } from "@/components/ui/compare/CompareButton";
import { toggleFavoriteAction } from "@/app/actions/favorite-actions";

interface Props {
  title: string;
  // Id del aviso (avión o repuesto, según "type").
  aircraftId: string;
  isFavoriteInitial?: boolean;
  // El mismo encabezado se usa en el detalle de repuesto: favorito, PDF y reporte dependen del tipo.
  type?: "AIRCRAFT" | "SPARE_PART";
  // VA-83: foto para la bandeja de comparación (solo aeronaves).
  compareImage?: string | null;
}

export function AircraftActionsHeader({ title, aircraftId, isFavoriteInitial = false, type = "AIRCRAFT", compareImage = null }: Props) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(isFavoriteInitial);
  const [isPending, setIsPending] = useState(false);
  
  // Estado para controlar la ventana/modal de compartir en mobile
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Manejador de favoritos
  const handleToggleFavorite = async () => {
    if (isPending) return;

    const previousState = isFavorite;
    setIsFavorite(!previousState);
    setIsPending(true);

    try {
      const res = await toggleFavoriteAction(aircraftId, type);
      if (res.needsLogin) {
        setIsFavorite(previousState);
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setIsFavorite(res.isFavorite);
    } catch {
      setIsFavorite(previousState);
      alert("Ocurrió un error al actualizar favoritos.");
    } finally {
      setIsPending(false);
    }
  };

  // Compartir: siempre la ventana flotante (pedido del socio, 9/10), también en celular.
  const handleShareClick = () => setIsShareModalOpen(true);

  // Manejador de descarga de PDF / Ficha Técnica
  const handleDownloadPdf = () => {
    if (typeof window !== "undefined") {
      window.open(type === "AIRCRAFT" ? `/api/aircraft/${aircraftId}/pdf` : `/api/spareparts/${aircraftId}/pdf`, "_blank");
    }
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <>
      <div className="w-full flex justify-between gap-3 print:hidden">
        <div className="w-full flex gap-3">
          {/* Favoritos, compartir e imprimir: botones reales con 44 px de área táctil en celular (VA-60) */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
            className="group flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 cursor-pointer select-none"
          >
            <Heart
              className={`transition-colors ${
                isFavorite
                  ? "text-red-600 fill-red-600"
                  : "text-slate-600 hover:text-red-600"
              }`}
            />
            <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100 text-xs font-semibold text-slate-700">
              {isFavorite ? "Guardado" : "Favoritos"}
            </span>
          </button>

          {/* Compartir */}
          <button
            type="button"
            onClick={handleShareClick}
            aria-label="Compartir"
            className="group flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 cursor-pointer select-none"
          >
            <Share2 className="hover:text-blue-600 transition-colors text-slate-600" />
            <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100 text-xs font-semibold text-slate-700">
              Compartir
            </span>
          </button>

          {type === "AIRCRAFT" && <CompareButton variant="detail" item={{ id: aircraftId, title, image: compareImage }} />}

          {/* Descargar PDF (Mantiene el icono Printer) */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            aria-label="Descargar PDF"
            className="group flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 cursor-pointer select-none"
          >
            <Printer className="hover:text-blue-600 transition-colors text-slate-600" />
            <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100 text-xs font-semibold text-slate-700">
              Imprimir
            </span>
          </button>
        </div>

        {/* VA-161: "Reportar" siempre a la vista (antes solo aparecía al pasar el mouse). */}
        <a
          href={type === "AIRCRAFT" ? `/report?aircraftId=${aircraftId}` : `/report?sparePartId=${aircraftId}`}
          className="group flex items-center justify-center gap-1.5 min-h-11 sm:min-h-0 select-none text-xs font-semibold text-slate-700 hover:text-amber-700"
        >
          <TriangleAlert className="h-5 w-5 text-primary transition-colors group-hover:text-amber-600" aria-hidden />
          Reportar
        </a>
      </div>

      <ShareDialog open={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} url={shareUrl} title={title} />
    </>
  );
}