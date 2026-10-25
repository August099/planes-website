"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateReportStatusAction } from "@/app/actions/report-actions";
import { pauseListingAction } from "@/app/actions/moderation-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ModerationHistory, type HistoryItem } from "@/components/admin/ModerationHistory";
import {
  Plane,
  Wrench,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { errorMessage } from "@/lib/errors";

interface ReportItem {
  id: string;
  reason: string;
  details: string | null;
  reporterEmail: string | null;
  status: "PENDING" | "REVIEWED" | "DISMISSED";
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
  aircraft: { id: string; title: string; status: string } | null;
  sparePart: { id: string; title: string; status: string } | null;
}

export function AdminReportsTable({ reports, history = {} }: { reports: ReportItem[]; history?: Record<string, HistoryItem[]> }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "REVIEWED" | "DISMISSED">("PENDING");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // VA-154: "Pausar indefinidamente" con motivo obligatorio (se le muestra al dueño).
  const [pausing, setPausing] = useState<ReportItem | null>(null);
  const [reason, setReason] = useState("");
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [pausePending, setPausePending] = useState(false);

  const confirmPause = async () => {
    if (!pausing) return;
    const target = pausing.aircraft ?? pausing.sparePart;
    if (!target) return;
    setPausePending(true);
    setPauseError(null);
    const res = await pauseListingAction({ kind: pausing.aircraft ? "AIRCRAFT" : "SPARE_PART", id: target.id, reason, reportId: pausing.id });
    setPausePending(false);
    if (!res.ok) {
      setPauseError(res.error);
      return;
    }
    setPausing(null);
    setReason("");
    router.refresh();
  };

  const filteredReports = reports.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  const handleStatusChange = async (reportId: string, newStatus: "PENDING" | "REVIEWED" | "DISMISSED") => {
    setLoadingId(reportId);
    try {
      await updateReportStatusAction(reportId, newStatus);
    } catch (err) {
      alert(errorMessage(err) || "Error al actualizar el estado");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros por Estado */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(["PENDING", "REVIEWED", "DISMISSED", "ALL"] as const).map((st) => {
          const count = st === "ALL" ? reports.length : reports.filter((r) => r.status === st).length;
          const labels = {
            PENDING: "Pendientes",
            REVIEWED: "Revisados",
            DISMISSED: "Desestimados",
            ALL: "Todos",
          };

          return (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                filter === st
                  ? "bg-[#001F58] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {labels[st]} ({count})
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No hay reportes para mostrar en esta categoría.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Publicación Afectada</th>
                  <th className="p-4">Motivo / Detalles</th>
                  <th className="p-4">Denunciante</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((r) => {
                  const targetTitle = r.aircraft?.title || r.sparePart?.title;
                  const targetUrl = r.aircraft
                    ? `/aircraft/${r.aircraft.id}`
                    : r.sparePart
                    ? `/spareparts/sparepart-details/${r.sparePart.id}`
                    : null;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Fecha */}
                      <td className="p-4 whitespace-nowrap text-slate-500 font-mono">
                        {new Date(r.createdAt).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Publicación Afectada */}
                      <td className="p-4 max-w-[200px]">
                        {targetUrl ? (
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:underline truncate max-w-full"
                          >
                            {r.aircraft ? (
                              <Plane className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{targetTitle}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Reporte General</span>
                        )}
                      </td>

                      {/* Motivo y Detalles */}
                      <td className="p-4 max-w-[250px]">
                        <p className="font-bold text-slate-900">{r.reason}</p>
                        {r.details && (
                          <p className="text-slate-500 text-[11px] truncate mt-0.5" title={r.details}>
                            {r.details}
                          </p>
                        )}
                        {(() => {
                          const target = r.aircraft ?? r.sparePart;
                          const h = target ? history[target.id] : undefined;
                          return (
                            <>
                              {target?.status === "MODERATED" && (
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">Pausado por moderación</p>
                              )}
                              {h && h.length > 0 && <ModerationHistory items={h} compact />}
                            </>
                          );
                        })()}
                      </td>

                      {/* Denunciante */}
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">
                          {r.user?.name || "Anónimo"}
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          {r.reporterEmail || r.user?.email || "Sin email"}
                        </p>
                      </td>

                      {/* Estado */}
                      <td className="p-4 whitespace-nowrap">
                        {r.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                        {r.status === "REVIEWED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Revisado
                          </span>
                        )}
                        {r.status === "DISMISSED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <XCircle className="w-3 h-3" /> Desestimado
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="p-4 text-right whitespace-nowrap">
                        {loadingId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {(r.aircraft ?? r.sparePart) && (r.aircraft ?? r.sparePart)!.status !== "MODERATED" && (
                              <button
                                onClick={() => {
                                  setPausing(r);
                                  setReason("");
                                  setPauseError(null);
                                }}
                                title="Pausar indefinidamente (con motivo)"
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[10px] rounded-lg border border-red-200 transition-colors cursor-pointer"
                              >
                                Pausar indefinidamente
                              </button>
                            )}
                            {r.status !== "REVIEWED" && (
                              <button
                                onClick={() => handleStatusChange(r.id, "REVIEWED")}
                                title="Marcar como Revisado"
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[10px] rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                              >
                                Resolver
                              </button>
                            )}
                            {r.status !== "DISMISSED" && (
                              <button
                                onClick={() => handleStatusChange(r.id, "DISMISSED")}
                                title="Desestimar Reporte"
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[10px] rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              >
                                Desestimar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pausing}
        eyebrow="Moderación"
        title="Pausar indefinidamente"
        confirmLabel="Pausar aviso"
        danger
        pending={pausePending}
        error={pauseError}
        onConfirm={() => void confirmPause()}
        onClose={() => setPausing(null)}
      >
        <p className="text-sm text-slate-600">
          “{pausing?.aircraft?.title ?? pausing?.sparePart?.title}” deja de verse en todo el sitio y no cuenta en el cupo del dueño. El
          dueño no lo puede reactivar: lo edita y pide revisión. Le llega un mail y una ventana con el motivo.
        </p>
        <label className="mt-3 block text-left">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Motivo (lo ve el dueño)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}