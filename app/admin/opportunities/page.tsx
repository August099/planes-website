"use client";

import { useEffect, useState } from "react";
import { getOpportunitiesAnalytics } from "../actions";
import { AlertTriangle, Flame, SearchX } from "lucide-react";

export default function AdminOpportunitiesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOpportunitiesAnalytics("30d")
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Calculando oportunidades comerciales...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Oportunidades Comerciales</h1>
        <p className="text-xs text-slate-500 mt-1">Análisis de oferta y demanda para captar nuevo inventario y optimizar publicaciones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <SearchX className="w-4 h-4 text-red-600" />
            Búsquedas sin Oferta Activa
          </h3>
          <p className="text-[11px] text-slate-400">Lo que buscan los usuarios pero no encuentran en el sitio.</p>
          <div className="space-y-2.5">
            {data?.highDemandNoSupply?.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No hay términos sin oferta detectados.</p>
            ) : (
              data?.highDemandNoSupply?.map((item: any) => (
                <div key={item.term} className="flex justify-between items-center p-3 rounded-xl bg-red-50/50 border border-red-100">
                  <span className="text-xs font-bold text-slate-800 capitalize">{item.term}</span>
                  <span className="text-xs font-bold text-red-600">{item.count} búsquedas</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Mucha Vista, Poco Contacto
          </h3>
          <p className="text-[11px] text-slate-400">Publicaciones populares con baja tasa de consulta (revisar precio/fotos).</p>
          <div className="space-y-2.5">
            {data?.highTrafficLowConversion?.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">Sin publicaciones estancadas.</p>
            ) : (
              data?.highTrafficLowConversion?.map((item: any) => (
                <div key={item.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 space-y-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{item.views} vistas</span>
                    <span className="text-amber-700 font-semibold">{item.contacts} contactos</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-600" />
            Alta Eficiencia de Conversión
          </h3>
          <p className="text-[11px] text-slate-400">Productos altamente atractivos para los compradores.</p>
          <div className="space-y-2.5">
            {data?.highEfficiency?.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">Aún sin métricas de alta conversión.</p>
            ) : (
              data?.highEfficiency?.map((item: any) => (
                <div key={item.id} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{item.contacts} contactos</span>
                    <span className="text-emerald-700 font-bold">{item.ratio}% conv.</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}