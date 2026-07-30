"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Plane, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  Link2, 
  Send,
  Loader2
} from "lucide-react";

export default function ReportPage() {
  const searchParams = useSearchParams();

  const aircraftId = searchParams.get("aircraftId");
  const sparePartId = searchParams.get("sparePartId");

  const [itemTitle, setItemTitle] = useState<string | null>(null);
  const [loadingTitle, setLoadingTitle] = useState<boolean>(false);

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItemTitle() {
      if (!aircraftId && !sparePartId) return;

      setLoadingTitle(true);
      try {
        const query = aircraftId 
          ? `aircraftId=${aircraftId}` 
          : `sparePartId=${sparePartId}`;
        
        const res = await fetch(`/api/reports/item-info?${query}`);
        if (res.ok) {
          const data = await res.json();
          setItemTitle(data.title);
        }
      } catch (err) {
        console.error("Error al obtener información de la publicación:", err);
      } finally {
        setLoadingTitle(false);
      }
    }

    fetchItemTitle();
  }, [aircraftId, sparePartId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aircraftId: aircraftId || undefined,
          sparePartId: sparePartId || undefined,
          reason,
          details: details.trim() || undefined,
          reporterEmail: reporterEmail.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Error al enviar el reporte");
      }

      setSubmitted(true);
    } catch (err) {
      setError("Ocurrió un error al enviar tu reporte. Por favor, reintenta.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="relative isolate overflow-hidden min-h-screen -mb-16 flex items-center justify-center py-16">
        <Image
          src="/bkg-report.jpg"
          alt="Fondo Reporte"
          fill
          priority
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-background/85" />

        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-8 backdrop-blur-sm shadow-xl text-center space-y-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="font-heading text-2xl font-semibold text-[#001F58]">
              REPORTE ENVIADO
            </h2>
            <p className="text-xs sm:text-sm text-[#001F58]/70">
              Gracias por colaborar con la seguridad y transparencia de la comunidad. Revisaremos la publicación a la brevedad.
            </p>
            <Link
              href="/"
              className="inline-block w-full bg-[#001F58] hover:bg-[#001F58]/90 text-white font-medium py-2.5 rounded-xl shadow-sm transition-colors text-sm"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16 flex items-center justify-center py-16">
      <Image
        src="/bkg-report.jpg"
        alt="Fondo Reporte"
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="container mx-auto px-4 max-w-lg">
        <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
          
          <div className="text-center space-y-1.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#001F58] uppercase">
              Reportar Publicación
            </h1>
            <p className="text-xs sm:text-sm text-[#001F58]/70">
              Informa sobre contenido inapropiado o irregularidades en la plataforma
            </p>
          </div>

          {(aircraftId || sparePartId) ? (
            <div className="p-3.5 bg-white/80 border border-[#001F58]/15 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-[#001F58]/5 rounded-lg text-[#001F58]">
                {aircraftId ? <Plane className="w-5 h-5 text-[#001F58]" /> : <Wrench className="w-5 h-5 text-[#001F58]" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#001F58]/50 block">
                  {aircraftId ? "Aeronave a reportar" : "Repuesto a reportar"}
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#001F58]">
                  <Link2 className="w-3.5 h-3.5 text-[#001F58]/50 shrink-0" />
                  {loadingTitle ? (
                    <span className="flex items-center gap-2 text-[#001F58]/50 text-xs font-normal">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando publicación...
                    </span>
                  ) : (
                    <span className="truncate">
                      {itemTitle || (aircraftId ? `Aeronave (${aircraftId})` : `Repuesto (${sparePartId})`)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Este reporte es general y no está directamente vinculado a una publicación específica.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#001F58]">
                Motivo del reporte <span className="text-[#E70F1F]">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white/80 border border-[#001F58]/20 rounded-lg focus:ring-2 focus:ring-[#001F58] focus:outline-none text-[#001F58] text-xs sm:text-sm font-sans"
              >
                <option value="" className="font-sans text-slate-800">Selecciona una opción...</option>
                <option value="Información engañosa o falsa" className="font-sans text-slate-800">Información engañosa o falsa</option>
                <option value="Posible estafa o fraude" className="font-sans text-slate-800">Posible estafa o fraude</option>
                <option value="Publicación duplicada" className="font-sans text-slate-800">Publicación duplicada</option>
                <option value="Contenido inapropiado u ofensivo" className="font-sans text-slate-800">Contenido inapropiado u ofensivo</option>
                <option value="Otro" className="font-sans text-slate-800">Otro motivo</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#001F58]">
                Detalles o Comentarios <span className="text-[#001F58]/50 font-normal">(Opcional)</span>
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Si deseas, puedes darnos más detalles del problema..."
                className="w-full px-3 py-2 bg-white/80 border border-[#001F58]/20 rounded-lg focus:ring-2 focus:ring-[#001F58] focus:outline-none text-[#001F58] text-xs sm:text-sm font-sans placeholder:text-[#001F58]/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#001F58]">
                Tu Email de Contacto <span className="text-[#001F58]/50 font-normal">(Opcional)</span>
              </label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="tuemail@ejemplo.com"
                className="w-full px-3 py-2 bg-white/80 border border-[#001F58]/20 rounded-lg focus:ring-2 focus:ring-[#001F58] focus:outline-none text-[#001F58] text-xs sm:text-sm font-sans placeholder:text-[#001F58]/40"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-xs sm:text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !reason}
              className="w-full mt-2 bg-[#E70F1F] hover:bg-[#c00d1a] text-white font-medium py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              {loading ? "Enviando..." : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Reporte
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </main>
  );
}