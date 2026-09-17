"use client";

import { useEffect, useState } from "react";
import { getListingsAnalytics } from "../actions";
import Link from "next/link";
import { Eye, PhoneCall, ExternalLink, Plane, Wrench, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminListingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    getListingsAnalytics("30d")
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Cargando métricas de publicaciones...</div>;
  }

  const formatPrice = (item: any) => {
    if (!item.price) return "A Consultar";

    if (item.type === "Aeronave" || !item.inPesos) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(item.price);
    }

    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(item.price);
  };

  // Lógica de Paginación
  const totalItems = data?.listings?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentListings = data?.listings?.slice(startIndex, startIndex + itemsPerPage) || [];

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-0 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Publicaciones y Performance</h1>
        <p className="text-xs text-slate-500 mt-1">Rendimiento de vistas y contactos de tu catálogo de aeronaves y repuestos.</p>
      </div>

      {/* TOP 5 MÁS VISTAS Y CONTACTADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            Top 5 Más Vistas
          </h3>
          <div className="space-y-3">
            {data?.mostViewed?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 gap-2">
                <div className="min-w-0 flex-1">
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
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 gap-2">
                <div className="min-w-0 flex-1">
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

      {/* TABLA PRINCIPAL CON CONTROLES DE PAGINACIÓN */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-[#001F58] text-sm">Todas las Publicaciones</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Mostrando {totalItems > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} resultados
            </p>
          </div>

          {/* BOTONES DE PAGINACIÓN DE LA CABECERA */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-600 px-1">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-2 pl-1 pr-3">Producto</th>
                <th className="py-2 px-3">Tipo</th>
                <th className="py-2 px-3">Precio</th>
                <th className="py-2 px-3">Vistas</th>
                <th className="py-2 px-3">Contactos</th>
                <th className="py-2 pr-1 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {currentListings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No hay publicaciones disponibles.
                  </td>
                </tr>
              ) : (
                currentListings.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 pl-1 pr-3 font-medium text-slate-800 max-w-[200px] sm:max-w-[280px]">
                      <span className="block truncate" title={item.title}>
                        {item.title}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {item.type === "Aeronave" ? (
                          <Plane className="w-3 h-3 text-red-500" />
                        ) : (
                          <Wrench className="w-3 h-3 text-blue-500" />
                        )}
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatPrice(item)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">{item.views}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-600 whitespace-nowrap">{item.contacts}</td>
                    <td className="py-3 pr-1 text-right whitespace-nowrap">
                      <Link
                        href={item.detailUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Ver Ficha <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PIE DE TABLA CON CONTROLES INFERIORES */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
            <span className="text-xs text-slate-500 font-medium">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}