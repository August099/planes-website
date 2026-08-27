"use client";

import { useEffect, useState } from "react";
import { getSearchesAnalytics } from "../actions";
import { Search, Hash } from "lucide-react";

export default function AdminSearchesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSearchesAnalytics("30d")
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Cargando métricas de búsquedas...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Intención de Búsqueda</h1>
        <p className="text-xs text-slate-500 mt-1">Descubrí qué están buscando los compradores en la plataforma.</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between max-w-sm">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Búsquedas (30 días)</p>
          <h3 className="text-2xl font-bold text-[#001F58] mt-1">{data?.totalSearches || 0}</h3>
        </div>
        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
          <Search className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
          <Hash className="w-4 h-4 text-red-600" />
          Términos de Búsqueda más Frecuentes
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-2">Término Buscado</th>
                <th className="py-2">Frecuencia / Cantidad</th>
                <th className="py-2 text-right">Última Búsqueda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {data?.topSearches?.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-400">
                    No hay registros de búsquedas aún.
                  </td>
                </tr>
              ) : (
                data?.topSearches?.map((item: any) => (
                  <tr key={item.term} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-800 capitalize">{item.term}</td>
                    <td className="py-3 font-bold text-red-600">{item.count} veces</td>
                    <td className="py-3 text-right text-slate-400">
                      {new Date(item.lastSearched).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}