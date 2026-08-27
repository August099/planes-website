"use client";

import { useEffect, useState } from "react";
import { getListingsAnalytics } from "../actions";
import Link from "next/link";
import { Eye, PhoneCall, ExternalLink, Plane, Wrench } from "lucide-react";

export default function AdminListingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getListingsAnalytics("30d")
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Cargando métricas de publicaciones...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Publicaciones y Performance</h1>
        <p className="text-xs text-slate-500 mt-1">Rendimiento de vistas y contactos de tu catálogo de aeronaves y repuestos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            Top 5 Más Vistas
          </h3>
          <div className="space-y-3">
            {data?.mostViewed?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="truncate pr-2">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                  <span className="text-[10px] text-slate-400 uppercase">{item.type}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-indigo-600">{item.views} vistas</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-600" />
            Top 5 Más Contactadas
          </h3>
          <div className="space-y-3">
            {data?.mostContacted?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="truncate pr-2">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                  <span className="text-[10px] text-slate-400 uppercase">{item.type}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-emerald-600">{item.contacts} contactos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-[#001F58] text-sm">Todas las Publicaciones</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-2">Producto</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Precio</th>
                <th className="py-2">Vistas</th>
                <th className="py-2">Contactos</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {data?.listings?.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 font-medium text-slate-800">{item.title}</td>
                  <td className="py-3 text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      {item.type === "Aeronave" ? <Plane className="w-3 h-3 text-red-500" /> : <Wrench className="w-3 h-3 text-blue-500" />}
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{item.price ? `USD $${item.price.toLocaleString()}` : "A Consultar"}</td>
                  <td className="py-3 font-semibold text-slate-700">{item.views}</td>
                  <td className="py-3 font-semibold text-emerald-600">{item.contacts}</td>
                  <td className="py-3 text-right">
                    <Link href={item.detailUrl} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
                      Ver Ficha <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}