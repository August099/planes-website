"use client";

import { useEffect, useState } from "react";
import { 
  getDashboardOverview, 
  PeriodFilter, 
  exportOldAnalyticsCSV, 
  archiveAndPurgeOldAnalytics 
} from "./actions";
import { 
  Users, 
  Eye, 
  PhoneCall, 
  Calendar,
  Layers,
  MessageCircle,
  Mail,
  Phone,
  Download,
  Trash2,
  TrendingUp
} from "lucide-react";

export default function AdminOverviewPage() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOverview = async (selectedPeriod: PeriodFilter) => {
    setLoading(true);
    try {
      const res = await getDashboardOverview(selectedPeriod);
      setData(res);
    } catch (err) {
      console.error("Error al cargar resumen:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(period);
  }, [period]);

  const handleDownloadCSV = async () => {
    setActionLoading(true);
    try {
      const res = await exportOldAnalyticsCSV();
      if (res.count === 0) {
        alert("No hay eventos con más de 90 días para exportar.");
        return;
      }
      const blob = new Blob([res.content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Error al generar la planilla CSV.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurge = async () => {
    const confirmPurge = confirm(
      "¿Estás seguro de enviar la planilla por correo y borrar permanentemente los eventos de más de 90 días de la base de datos?"
    );
    if (!confirmPurge) return;

    setActionLoading(true);
    try {
      const res = await archiveAndPurgeOldAnalytics();
      alert(res.message);
      fetchOverview(period);
    } catch (err: any) {
      alert(err.message || "Error al respaldar y purgar analíticas.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* CABECERA & ACCIONES DE MANTENIMIENTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#001F58]">Resumen General</h1>
          <p className="text-xs text-slate-500 mt-1">
            Consolidado de visitas, conversión e interacciones comerciales de la plataforma.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* RESPALDO Y PURGA */}
          <button
            onClick={handleDownloadCSV}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Descargar datos crudos >90 días en formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            CSV (+90 días)
          </button>

          <button
            onClick={handlePurge}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Enviar informe por email y borrar eventos antiguos de la DB"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            Purgar DB
          </button>

          {/* FILTROS DE RANGO TEMPORAL */}
          <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-sm gap-1">
            <Calendar className="w-4 h-4 text-[#001F58] ml-2" />
            {[
              { id: "today", label: "Hoy" },
              { id: "30d", label: "Últimos 30 días" },
              { id: "all", label: "Todo el histórico" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setPeriod(btn.id as PeriodFilter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  period === btn.id
                    ? "bg-[#001F58] text-white shadow"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-medium text-sm">
          Cargando datos del panel...
        </div>
      ) : data ? (
        <>
          {/* TARJETAS PRINCIPALES (SIN DUPLICAR DATOS INNECESARIOS) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tráfico de Usuarios</p>
                <h3 className="text-2xl font-bold text-[#001F58] mt-1">{data.kpis.uniqueVisitors}</h3>
                <p className="text-[11px] text-slate-500 mt-1">{data.kpis.identifiedUsers} usuarios registrados/logueados</p>
              </div>
              <div className="p-3 bg-blue-50 text-[#001F58] rounded-xl">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aeronaves / Repuestos Vistos</p>
                <h3 className="text-2xl font-bold text-[#001F58] mt-1">{data.kpis.totalViews}</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Aeronaves ({data.viewsBreakdown.aircraftViews}) | Repuestos ({data.viewsBreakdown.partsViews})
                </p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Eye className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interacciones Comerciales</p>
                <h3 className="text-2xl font-bold text-[#001F58] mt-1">{data.kpis.totalContacts}</h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  {data.kpis.totalViews > 0 
                    ? `Ratio de conversión global: ${((data.kpis.totalContacts / data.kpis.totalViews) * 100).toFixed(1)}%` 
                    : "Sin conversión"}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <PhoneCall className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ANALÍTICA DETALLADA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* DESGLOSE POR CANAL DE CONTACTO */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Origen de los Contactos
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-slate-700">WhatsApp Directo</span>
                  </div>
                  <span className="text-sm font-bold text-[#001F58]">{data.contactsBreakdown.whatsapp}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-slate-700">Llamadas Telefónicas</span>
                  </div>
                  <span className="text-sm font-bold text-[#001F58]">{data.contactsBreakdown.phone}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-slate-700">Correos Directos</span>
                  </div>
                  <span className="text-sm font-bold text-[#001F58]">{data.contactsBreakdown.email}</span>
                </div>
              </div>
            </div>

            {/* TABLA DE TENDENCIA DIARIA */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-[#001F58] text-sm">Registro de Vistas vs. Contactos Generados</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Vistas</th>
                      <th className="py-2">Contactos</th>
                      <th className="py-2">Ratio Conversión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {data.chartData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Sin actividad registrada en este rango de tiempo.
                        </td>
                      </tr>
                    ) : (
                      data.chartData.map((row: any) => {
                        const ratio = row.views > 0 ? ((row.contacts / row.views) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={row.date} className="hover:bg-slate-50">
                            <td className="py-2.5 font-medium text-slate-700">{row.date}</td>
                            <td className="py-2.5 text-slate-600">{row.views}</td>
                            <td className="py-2.5 text-emerald-600 font-semibold">{row.contacts}</td>
                            <td className="py-2.5 text-slate-500 font-medium">{ratio}%</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}