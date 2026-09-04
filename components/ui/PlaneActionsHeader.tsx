"use client";

import { useState } from "react";
import { 
  Heart, 
  Share2, 
  Printer, 
  TriangleAlert, 
  Check, 
  X, 
  Copy, 
  Mail, 
  MessageCircle 
} from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/favorite-actions";

// Icono personalizado de X (Twitter)
function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Icono personalizado de Facebook
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface Props {
  title: string;
  aircraftId: string;
  isFavoriteInitial?: boolean;
}

export function PlaneActionsHeader({ title, aircraftId, isFavoriteInitial = false }: Props) {
  const [copied, setCopied] = useState(false);
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
      const res = await toggleFavoriteAction(aircraftId, "AIRCRAFT");
      setIsFavorite(res.isFavorite);
    } catch (error: any) {
      setIsFavorite(previousState);
      if (error?.message === "UNAUTHENTICATED") {
        alert("Debes iniciar sesión para guardar favoritos.");
      } else {
        alert("Ocurrió un error al actualizar favoritos.");
      }
    } finally {
      setIsPending(false);
    }
  };

  // Abrir modal o menú nativo
  const handleShareClick = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    // Intentar Web Share API nativa si existe el soporte del navegador
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Mirá esta publicación en Ventas Aeronáuticas: ${title}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Si el usuario cancela la Web Share API no hacemos nada
        return;
      }
    }

    // Si no soporta Web Share API o falla, abrimos el modal personalizado
    setIsShareModalOpen(true);
  };

  // Copiar link al portapapeles
  const handleCopyLink = async () => {
    if (typeof window !== "undefined") {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentUrl = typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";
  const shareText = encodeURIComponent(`Mirá esta publicación en Ventas Aeronáuticas: ${title}`);

  return (
    <>
      <div className="w-full flex justify-between gap-3 print:hidden">
        <div className="w-full flex gap-3">
          {/* Favoritos */}
          <div
            onClick={handleToggleFavorite}
            className="group flex items-center cursor-pointer select-none"
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
          </div>

          {/* Compartir */}
          <div
            onClick={handleShareClick}
            className="group flex items-center cursor-pointer select-none"
          >
            <Share2 className="hover:text-blue-600 transition-colors text-slate-600" />
            <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100 text-xs font-semibold text-slate-700">
              Compartir
            </span>
          </div>

          {/* Imprimir */}
          <div
            onClick={() => typeof window !== "undefined" && window.print()}
            className="group flex items-center cursor-pointer select-none"
          >
            <Printer className="hover:text-blue-600 transition-colors text-slate-600" />
            <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100 text-xs font-semibold text-slate-700">
              Imprimir
            </span>
          </div>
        </div>

        {/* Reportar */}
        <a
          href={`/report?aircraftId=${aircraftId}`}
          className="group flex items-center select-none"
        >
          <span className="mr-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:mr-2 group-hover:max-w-40 group-hover:opacity-100 text-xs font-semibold text-slate-700">
            Reportar
          </span>
          <TriangleAlert className="text-primary cursor-pointer hover:text-amber-600 transition-colors" />
        </a>
      </div>

      {/* MODAL DE COMPARTIR PERSONALIZADO (Bottom Sheet en Mobile) */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#001F58] text-base">Compartir publicación</h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Redes y Medios */}
            <div className="grid grid-cols-4 gap-4 py-2 text-center">
              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${shareText}%20${currentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">WhatsApp</span>
              </a>

              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FacebookIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">Facebook</span>
              </a>

              {/* Twitter / X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${currentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <TwitterIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">X (Twitter)</span>
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(title)}&body=${shareText}%20${currentUrl}`}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">Email</span>
              </a>
            </div>

            {/* Input Copiar Enlace */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                O copiá el enlace directo:
              </label>
              <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== "undefined" ? window.location.href : ""}
                  className="flex-1 bg-transparent px-2 text-xs text-slate-600 truncate focus:outline-none"
                />
                <button
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
        </div>
      )}
    </>
  );
}