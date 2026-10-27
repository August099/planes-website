"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, ChevronDown } from "lucide-react";

// Fotos de referencia del formulario de aviones (27/10, dibujos del socio en public/form-types; originales en
// assets/originals/form-types). Sin fotos cargadas se ven en recuadros, con una explicación al pasar el mouse
// (o al enfocar con el teclado). Con al menos una foto se repliegan en un botón en la esquina de la sección.
export const REFERENCE_VIEWS = [
  { src: "/form-types/portada.webp", title: "Portada", tip: "Vista 3/4 de adelante, con todo el avión en cuadro. Es la foto que se ve en los listados." },
  { src: "/form-types/frente.webp", title: "Frente", tip: "De frente, a la altura de la nariz: hélice, tren y las dos alas." },
  { src: "/form-types/izquierda.webp", title: "Lado izquierdo", tip: "Perfil completo del lado izquierdo, de la hélice a la cola." },
  { src: "/form-types/derecha.webp", title: "Lado derecho", tip: "Perfil completo del lado derecho, de la hélice a la cola." },
  { src: "/form-types/trasera.webp", title: "3/4 trasera", tip: "Desde atrás y un costado: cola, empenaje y matrícula." },
  { src: "/form-types/interior.webp", title: "Interior", tip: "El tablero completo y los asientos, con buena luz." },
] as const;

function Grid() {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {REFERENCE_VIEWS.map((v) => (
        <li key={v.src}>
          <div
            tabIndex={0}
            className="group/ref relative aspect-square overflow-hidden rounded-xl border border-dashed border-[#00205B]/25 bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#0A4C96]"
          >
            <Image src={v.src} alt="" fill sizes="(min-width: 640px) 110px, 30vw" className="object-contain p-2" />
            <span className="absolute inset-x-0 bottom-0 bg-white/90 px-1 py-0.5 text-center text-[10px] font-bold text-[#00205B]">{v.title}</span>
            {/* Explicación al pasar o al enfocar */}
            <span className="pointer-events-none absolute inset-0 flex items-center bg-[#00205B]/95 p-2 text-[10.5px] leading-snug text-white opacity-0 transition-opacity group-hover/ref:opacity-100 group-focus-visible/ref:opacity-100">
              {v.tip}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReferencePhotos({ hasImages }: { hasImages: boolean }) {
  const [open, setOpen] = useState(false);
  if (!hasImages) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-600">Fotos que conviene sacar (pasá el mouse para ver cómo):</p>
        <Grid />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#00205B]/20 bg-white px-3 text-xs font-bold text-[#00205B] transition-colors hover:border-[#00205B] cursor-pointer"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden />
          Fotos de referencia
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      {open && <Grid />}
    </div>
  );
}
