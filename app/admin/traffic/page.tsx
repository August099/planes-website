"use client";

import { useEffect, useState } from "react";
import { getTrafficSourcesAnalytics } from "../actions";
import { Globe2, Users, UserCheck, UserX, ArrowUpRight } from "lucide-react";

export default function AdminTrafficPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrafficSourcesAnalytics("30d")
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 font-medium">Cargando métricas de tráfico...</div>;
  }

  const reg = data?.userSegmentation?.registered || { views: 0, contacts: 0 };
  const anon = data?.userSegmentation?.anonymous || { views: 0, contacts: 0 };
  const totalViews = reg.views + anon.views;

  const regPercentage = totalViews > 0 ? ((reg.views / totalViews) * 100).toFixed(1) : "0";
  const anonPercentage = totalViews > 0 ? ((anon.views / totalViews) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Fuentes de Tráfico y Audiencia</h1>
        <p className="text-xs text-slate-500 mt-1">Conocé de dónde vienen tus visitantes y qué tipo de usuarios generan más interacción.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SITIOS DE ORIGEN */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-600" />
            Principales Sitios de Origen (Referrers)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-2">Origen / Canal</th>
                  <th className="py-2">Interacciones</th>
                  <th className="py-2 text-right">Contactos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data?.topReferrers?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">Sin datos de origen registrados.</td>
                  </tr>
                ) : (
                  data?.topReferrers?.map((item: any) => (
                    <tr key={item.source} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-700 max-w-xs truncate flex items-center gap-1.5">
                        <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.source}</span>
                      </td>
                      <td className="py-2.5 text-slate-600">{item.views}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">{item.contacts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SEGMENTACIÓN DE USUARIOS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Comportamiento: Registrados vs Anónimos
          </h3>

          <div className="space-y-4">
            {/* USUARIOS REGISTRADOS */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Usuarios Registrados</span>
                </div>
                <span className="text-xs font-bold text-blue-700">{regPercentage}% del tráfico</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>Eventos totales: <strong>{reg.views}</strong></span>
                <span>Contactos iniciados: <strong className="text-emerald-600">{reg.contacts}</strong></span>
              </div>
            </div>

            {/* VISITANTES ANÓNIMOS */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800">Visitantes Anónimos</span>
                </div>
                <span className="text-xs font-bold text-slate-600">{anonPercentage}% del tráfico</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>Eventos totales: <strong>{anon.views}</strong></span>
                <span>Contactos iniciados: <strong className="text-emerald-600">{anon.contacts}</strong></span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
            💡 <strong>Tip comercial:</strong> Si la mayoría de los contactos proviene de usuarios anónimos, simplificar la navegación sin exigir login previo aumentará la conversión de llamadas y clics a WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}