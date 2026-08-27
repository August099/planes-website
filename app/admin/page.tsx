"use client";

import { useEffect, useState } from "react";
import { getDashboardOverview, PeriodFilter } from "./actions";
import { 
  Users, 
  Eye, 
  PhoneCall, 
  PlusCircle, 
  Calendar,
  Layers,
  MessageCircle,
  Mail,
  Phone
} from "lucide-react";

export default function AdminOverviewPage() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#001F58]">Resumen General</h1>
          <p className="text-xs text-slate-500 mt-1">
            Métricas de rendimiento e interacciones comerciales de la plataforma.
          </p>
        </div>

        <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-sm gap-1">
          <Calendar className="w-4 h-4 text-[#001F58] ml-2" />
          {[
            { id: "today", label: "Hoy" },
            { id: "7d", label: "7 días" },
            { id: "30d", label: "30 días" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriod(btn.id as PeriodFilter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
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

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-medium text-sm">
          Cargando datos del panel...
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visitantes Únicos</p>
                <h3 className="text-2xl font-bold text-[#001F58] mt-1">{data.kpis.uniqueVisitors}</h3>
                <p className="text-[11px] text-slate-400 mt-1">{data.kpis.identifiedUsers} identificados</p>
              </div>
              <div className="p-3 bg-blue-50 text-[#001F58] rounded-xl">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vistas Totales</p>
                <h3 className="text-2xl font-bold text-[#001F58] mt-1">{data.kpis.totalViews}</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Aeronaves ({data.viewsBreakdown.aircraftViews}) | Repuestos ({data.viewsBreakdown.partsViews})
                </p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Eye className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contactos Generados</p>
                <h3 className="text-2xl font-bold text-[#001F58] mt-1">{data.kpis.totalContacts}</h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  {data.contactsBreakdown.whatsapp} clics directos a WA
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <PhoneCall className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Publicaciones Activas</p>
                <h3 className="text-2xl font-bold text-[#001F58] mt-1">{data.kpis.activeListings}</h3>
                <p className="text-[11px] text-red-600 font-medium mt-1">
                  +{data.kpis.newListings} creadas en el período
                </p>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <PlusCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-600" />
                Desglose de Conversiones
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-slate-700">WhatsApp</span>
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

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-slate-700">Formularios Lead</span>
                  </div>
                  <span className="text-sm font-bold text-[#001F58]">{data.contactsBreakdown.formLeads}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-[#001F58] text-sm">Registro Diario de Vistas e Interacciones</h3>
              
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
                            <td className="py-2.5 text-slate-500">{ratio}%</td>
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