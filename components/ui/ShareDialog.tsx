"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, MessageCircle, Mail, Copy, Check } from "lucide-react";

// Ventana flotante de "Compartir" (pedido del socio, 9/10): la usan las cards y el detalle, en
// celular y en escritorio. Antes cada lugar hacía otra cosa (menú nativo del celular, copiar el
// link sin avisar, o este modal), según el ancho de pantalla.

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ShareDialog({
  open,
  onClose,
  url,
  title,
  heading = "Compartir publicación",
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  heading?: string;
}) {
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const encodedUrl = encodeURIComponent(url);
  const text = encodeURIComponent(`Mirá esta publicación en Ventas Aeronáuticas: ${title}`);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el link queda visible en el campo para copiarlo a mano.
    }
  };

  // Los clics dentro del modal no tienen que llegar a la card (que es un link al detalle).
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const options = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${text}%20${encodedUrl}`,
      icon: <MessageCircle className="w-6 h-6" />,
      tone: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <FacebookIcon className="w-5 h-5" />,
      tone: "bg-blue-100 text-blue-600",
    },
    {
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
      icon: <XIcon className="w-5 h-5" />,
      tone: "bg-slate-100 text-slate-800",
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${text}%20${encodedUrl}`,
      icon: <Mail className="w-5 h-5" />,
      tone: "bg-indigo-100 text-indigo-600",
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="w-full sm:max-w-md bg-white rounded-t-lg sm:rounded-lg p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300"
        onClick={stop}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-[#001F58] text-base">{heading}</h3>
          <button
            ref={closeRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 py-2 text-center">
          {options.map((o) => (
            <a
              key={o.label}
              href={o.href}
              target={o.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={stop}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-lg ${o.tone} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                {o.icon}
              </div>
              <span className="text-[11px] font-semibold text-slate-700">{o.label}</span>
            </a>
          ))}
        </div>

        <div className="pt-2">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">O copiá el enlace directo:</p>
          <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              type="text"
              readOnly
              value={url}
              aria-label="Enlace de la publicación"
              onClick={(e) => {
                stop(e);
                (e.target as HTMLInputElement).select();
              }}
              className="flex-1 min-w-0 bg-transparent px-2 text-xs text-slate-600 truncate focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-10 px-3 py-1.5 bg-[#001F58] hover:bg-blue-900 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
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
  );
}
