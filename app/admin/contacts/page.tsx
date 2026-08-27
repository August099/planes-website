"use client";

import { useEffect, useState } from "react";
import { getContactsAnalytics } from "../actions";
import { MessageCircle, Phone, Mail, UserCheck, Inbox } from "lucide-react";

export default function AdminContactsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContactsAnalytics("30d")
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Cargando métricas de contactos...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Contactos y Leads Comerciales</h1>
        <p className="text-xs text-slate-500 mt-1">Diferenciación entre clics de contacto e intenciones reales de compra.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">WhatsApp</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{data?.channels?.whatsapp || 0}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Clics directos</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <MessageCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Teléfono</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{data?.channels?.phone || 0}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Llamadas iniciadas</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Phone className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Email</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{data?.channels?.email || 0}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Correos directos</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Mail className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Formularios (Leads)</p>
            <h3 className="text-2xl font-bold text-[#001F58] mt-1">{data?.channels?.formLeads || 0}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Contactos con datos en BD</p>
          </div>
          <div className="p-3 bg-slate-100 text-[#001F58] rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
          <Inbox className="w-4 h-4 text-red-600" />
          Leads Recibidos por Formulario
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-2">Comprador</th>
                <th className="py-2">Email / Teléfono</th>
                <th className="py-2">Producto</th>
                <th className="py-2">Mensaje</th>
                <th className="py-2 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {data?.recentLeads?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No se han registrado leads por formulario en este período.
                  </td>
                </tr>
              ) : (
                data?.recentLeads?.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-800">{lead.buyerName}</td>
                    <td className="py-3 text-slate-600">
                      <div>{lead.buyerEmail}</div>
                      <div className="text-[10px] text-slate-400">{lead.buyerPhone || "Sin teléfono"}</div>
                    </td>
                    <td className="py-3 text-slate-700">
                      <span className="font-medium">{lead.productTitle}</span>
                      <span className="block text-[10px] text-slate-400">{lead.productType}</span>
                    </td>
                    <td className="py-3 text-slate-500 max-w-xs truncate">{lead.message}</td>
                    <td className="py-3 text-right text-slate-400">
                      {new Date(lead.createdAt).toLocaleDateString()}
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