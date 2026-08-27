"use client";

import { useEffect, useState } from "react";
import { getTrafficSourcesAnalytics } from "../actions";
import { Globe2, Megaphone } from "lucide-react";

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
    return <div className="py-20 text-center text-slate-400">Cargando métricas de tráfico...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Fuentes de Tráfico y Campañas</h1>
        <p className="text-xs text-slate-500 mt-1">Conocé de dónde vienen tus visitantes y qué canales traen más contactos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-600" />
            Sitios de Origen (Referrers)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-2">Origen</th>
                  <th className="py-2">Eventos</th>
                  <th className="py-2 text-right">Contactos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data?.topReferrers?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">Sin datos de origen.</td>
                  </tr>
                ) : (
                  data?.topReferrers?.map((item: any) => (
                    <tr key={item.source} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-700 max-w-xs truncate">{item.source}</td>
                      <td className="py-2.5 text-slate-600">{item.views}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">{item.contacts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-red-600" />
            Campañas UTM
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-2">Source / Medium (Campaña)</th>
                  <th className="py-2">Eventos</th>
                  <th className="py-2 text-right">Contactos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data?.topUtms?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
                      No hay registros con parámetros UTM en este período.
                    </td>
                  </tr>
                ) : (
                  data?.topUtms?.map((item: any) => (
                    <tr key={item.campaign} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-700 max-w-xs truncate">{item.campaign}</td>
                      <td className="py-2.5 text-slate-600">{item.views}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">{item.contacts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}