"use client";

import { useEffect, useState } from "react";
import { getLiveEvents } from "../actions";
import { ListFilter } from "lucide-react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const fetchEvents = (filter: string) => {
    setLoading(true);
    getLiveEvents(filter)
      .then((res) => setEvents(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents(typeFilter);
  }, [typeFilter]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#001F58]">Auditoría de Eventos en Vivo</h1>
          <p className="text-xs text-slate-500 mt-1">Inspección de las últimas 50 interacciones registradas en el sistema.</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
          <ListFilter className="w-4 h-4 text-[#001F58] ml-1" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="PAGE_VIEW">PAGE_VIEW</option>
            <option value="VIEW_AIRCRAFT">VIEW_AIRCRAFT</option>
            <option value="VIEW_SPARE_PART">VIEW_SPARE_PART</option>
            <option value="SEARCH">SEARCH</option>
            <option value="WHATSAPP">WHATSAPP</option>
            <option value="PHONE">PHONE</option>
            <option value="EMAIL">EMAIL</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="py-10 text-center text-slate-400 text-xs">Cargando eventos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-2">Fecha / Hora</th>
                  <th className="py-2">Tipo de Evento</th>
                  <th className="py-2">Visitante / User</th>
                  <th className="py-2">Objeto Relacionado</th>
                  <th className="py-2">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">Sin eventos registrados para este filtro.</td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-600 whitespace-nowrap">
                        {new Date(ev.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px]">
                          {ev.eventType}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px] max-w-[120px] truncate">
                        {ev.userId ? `User: ${ev.userId}` : ev.anonymousId || "Anónimo"}
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px]">
                        {ev.aircraftId ? `Aeronave: ${ev.aircraftId}` : ev.sparePartId ? `Repuesto: ${ev.sparePartId}` : "-"}
                      </td>
                      <td className="py-2.5 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                        {ev.metadata ? JSON.stringify(ev.metadata) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}