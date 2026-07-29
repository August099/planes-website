"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function ReportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aircraftTitle, setAircraftTitle] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Parámetros de la URL
  const aircraftId = searchParams.get("aircraftId");
  const titleFromUrl = searchParams.get("title"); // Opcional: si lo pasas por URL como ?title=Cessna%20172
  
  // Si tienes un sistema de sesión (ej: const { user } = useUser(); o useSession())
  // puedes usar su ID aquí. Si no está autenticado, será null.
  const userId = "id_del_usuario_actual"; // <-- Reemplazar por tu hook de auth real (o pasarlo según corresponda)

  useEffect(() => {
    if (titleFromUrl) {
      setAircraftTitle(titleFromUrl);
    } else if (aircraftId) {
      // Opcional: Si solo viene el ID, podrías hacer un fetch breve a tu API
      // fetch(`/api/aircraft/${aircraftId}`).then(res => res.json()).then(data => setAircraftTitle(data.title));
      setAircraftTitle(`Publicación #${aircraftId}`);
    }
  }, [aircraftId, titleFromUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    // Los datos incluirán automáticamente:
    // formData.get("aircraftId")
    // formData.get("userId")
    // formData.get("reason")
    // formData.get("description")
    // formData.get("reporterEmail")

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <main className="relative isolate overflow-hidden min-h-screen flex items-center justify-center -mb-16 px-4 py-12">
      <Image
        src="/bkg-report.jpg"
        alt="Fondo Denuncia"
        fill
        priority
        className="-z-20 object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-background/80 backdrop-blur-md" />

      <div className="max-w-xl w-full bg-white/70 backdrop-blur-md border border-[#001F58]/15 rounded-3xl p-8 sm:p-12 shadow-xl my-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E70F1F]/10 border border-[#E70F1F]/20 text-[#E70F1F] text-xs font-semibold tracking-wider uppercase mb-6">
          <span className="w-2 h-2 rounded-full bg-[#E70F1F] animate-pulse"></span>
          Centro de Seguridad y Reportes
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#001F58] tracking-tight mb-2">
          Denunciar Publicación
        </h1>

        <p className="text-sm sm:text-base text-[#001F58]/70 leading-relaxed mb-6">
          Ayúdanos a mantener la comunidad segura. Revisamos cada reporte para
          garantizar la transparencia en las operaciones.
        </p>

        {submitted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <h3 className="font-heading text-lg font-bold text-[#001F58]">
              Reporte enviado con éxito
            </h3>
            <p className="text-xs sm:text-sm text-[#001F58]/80">
              Nuestro equipo de auditoría analizará la información enviada a la
              brevedad. Gracias por colaborarnos.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-block px-6 py-2.5 rounded-xl bg-[#001F58] text-white text-xs font-medium hover:bg-[#001F58]/90 transition-all shadow-md cursor-pointer"
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            {/* INPUTS OCULTOS PARA BACKEND (NO VISIBLES PARA EL USUARIO) */}
            <input type="hidden" name="aircraftId" value={aircraftId || ""} />
            <input type="hidden" name="userId" value={userId || ""} />

            {/* MUESTRA VISUAL DEL TÍTULO DE LA PUBLICACIÓN */}
            {aircraftId && (
              <div className="bg-[#001F58]/5 border border-[#001F58]/15 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-[#001F58]/60 uppercase tracking-wider">
                    Publicación a denunciar
                  </span>
                  <span className="text-sm font-semibold text-[#001F58]">
                    {aircraftTitle || "Cargando datos de la aeronave..."}
                  </span>
                </div>
                <span className="text-xs bg-[#001F58]/10 text-[#001F58] px-2 py-1 rounded-md font-mono">
                  Vinculado
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#001F58] uppercase tracking-wider mb-2">
                Motivo del reporte *
              </label>
              <select
                required
                name="reason"
                className="w-full px-4 py-3 rounded-xl bg-white/90 border border-[#001F58]/20 text-[#001F58] text-sm focus:outline-none focus:border-[#001F58] focus:ring-2 focus:ring-[#001F58]/10 transition-all"
              >
                <option value="">Selecciona un motivo...</option>
                <option value="FRAUD">
                  Información engañosa o sospecha de estafa
                </option>
                <option value="INACCURATE_DATA">
                  Datos técnicos o fotos incorrectas
                </option>
                <option value="SOLD">La aeronave ya fue vendida</option>
                <option value="DUPLICATE">Publicación duplicada</option>
                <option value="SUSPICIOUS_SELLER">
                  Vendedor sospechoso / Spam
                </option>
                <option value="OTHER">Otro motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#001F58] uppercase tracking-wider mb-2">
                Tu Correo de Contacto *
              </label>
              <input
                type="email"
                required
                name="reporterEmail"
                placeholder="piloto@ejemplo.com"
                className="w-full px-4 py-3 rounded-xl bg-white/90 border border-[#001F58]/20 text-[#001F58] text-sm placeholder:text-[#001F58]/40 focus:outline-none focus:border-[#001F58] focus:ring-2 focus:ring-[#001F58]/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#001F58] uppercase tracking-wider mb-2">
                Detalle o explicación *
              </label>
              <textarea
                required
                name="description"
                rows={4}
                placeholder="Describe brevemente lo sucedido o el motivo por el cual reportas esta publicación..."
                className="w-full px-4 py-3 rounded-xl bg-white/90 border border-[#001F58]/20 text-[#001F58] text-sm placeholder:text-[#001F58]/40 focus:outline-none focus:border-[#001F58] focus:ring-2 focus:ring-[#001F58]/10 transition-all resize-none"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/80 hover:bg-white border border-[#001F58]/20 text-[#001F58] font-medium text-sm transition-all text-center shadow-sm cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E70F1F] hover:bg-[#E70F1F]/90 text-white font-medium text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Enviando..." : "Enviar Denuncia"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}