"use client";

import { useState, useEffect } from "react";
import { getDashboardMetrics } from "../actions";
import { 
  DollarSign, 
  Users, 
  Package, 
  MessageSquare, 
  CheckCircle, 
  BarChart3, 
  Target,
  HelpCircle
} from "lucide-react";

// DICCIONARIO DE DESCRIPCIONES DE LAS MÉTRICAS
const METRIC_DESCRIPTIONS: Record<string, string> = {
  "Ingresos Mensuales (MRR)": "Revenue recurrente mensual generado por suscripciones activas y paquetes en la plataforma.",
  "Ingresos Anuales (ARR)": "Proyección anualizada de los ingresos recurrentes (MRR × 12).",
  "Margen EBITDA": "Porcentaje de rentabilidad operativa antes de intereses, impuestos, depreciación y amortización.",
  "Crecimiento (Mes/Año)": "Porcentaje de variación de ingresos comparando el mes actual respecto al mes anterior.",
  "Usuarios Activos (MAU)": "Cantidad de usuarios únicos que interactuaron con la plataforma en los últimos 30 días.",
  "Publicadores Activos": "Número de vendedores que tienen al menos una publicación activa en el catálogo.",
  "Publicaciones Activas": "Inventario total disponible actualmente entre aeronaves y repuestos activos.",
  "Contactos Generados": "Total histórico de consultas enviadas y clics en WhatsApp, teléfono o email.",
  "Ventas Concretadas": "Cantidad de publicaciones de aeronaves y repuestos marcadas como vendidas.",
  "Volumen Facilitado (GMV)": "Valor monetario acumulado de las operaciones de compra-venta facilitadas.",
  "Retención de Publicadores": "Porcentaje de vendedores que vuelven a publicar o renovar sus anuncios expirados.",
  "Costo de Adquisición (CAC)": "Inversión estimada de marketing requerida para captar un nuevo publicador."
};

export default function AdminMetricsDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 0,
    arr: 0,
    ebitda: 0,
    revenueGrowth: 0,
    mau: 0,
    activePublishers: 0,
    activeListings: 0,
    contactsGenerated: 0,
    completedSales: 0,
    gmv: 0,
    retentionRate: 0,
    cac: 0
  });

  useEffect(() => {
    getDashboardMetrics()
      .then((data) => {
        setMetrics(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat("es-AR").format(val);

  if (loading) {
    return <div className="p-10 text-center text-slate-500 text-sm">Calculando métricas del negocio...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-[#001F58]">Métricas de Negocio (KPIs)</h1>
        <p className="text-xs text-slate-500 mt-1">Monitoreo en tiempo real del rendimiento financiero y operativo de la plataforma (en Pesos ARS).</p>
      </div>

      {/* MÉTRICAS FINANCIERAS CRÍTICAS */}
      <section>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" /> Rendimiento Financiero
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Ingresos Mensuales (MRR)" value={formatCurrency(metrics.mrr)} trend={`${metrics.revenueGrowth >= 0 ? '+' : ''}${metrics.revenueGrowth}%`} isCritical />
          <KpiCard title="Ingresos Anuales (ARR)" value={formatCurrency(metrics.arr)} isCritical />
          <KpiCard title="Margen EBITDA" value={`${metrics.ebitda}%`} isCritical />
          <KpiCard title="Crecimiento (Mes/Año)" value={`${metrics.revenueGrowth}%`} trend={metrics.revenueGrowth >= 0 ? "Positivo" : "Negativo"} isCritical />
        </div>
      </section>

      {/* MÉTRICAS DE OPERACIÓN Y TRACCIÓN */}
      <section>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" /> Tracción y Usuarios
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Usuarios Activos (MAU)" value={formatNumber(metrics.mau)} icon={<Users />} />
          <KpiCard title="Publicadores Activos" value={formatNumber(metrics.activePublishers)} icon={<CheckCircle />} />
          <KpiCard title="Publicaciones Activas" value={formatNumber(metrics.activeListings)} icon={<Package />} />
          <KpiCard title="Contactos Generados" value={formatNumber(metrics.contactsGenerated)} icon={<MessageSquare />} />
        </div>
      </section>

      {/* MÉTRICAS DE CONVERSIÓN Y MERCADO */}
      <section>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-600" /> Conversión y Mercado
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Ventas Concretadas" value={formatNumber(metrics.completedSales)} />
          <KpiCard title="Volumen Facilitado (GMV)" value={formatCurrency(metrics.gmv)} />
          <KpiCard title="Retención de Publicadores" value={`${metrics.retentionRate}%`} />
          <KpiCard title="Costo de Adquisición (CAC)" value={formatCurrency(metrics.cac)} />
        </div>
      </section>
    </div>
  );
}

function KpiCard({ title, value, trend, icon, isCritical }: { title: string, value: string, trend?: string, icon?: React.ReactNode, isCritical?: boolean }) {
  const isNegativeTrend = trend?.startsWith("-");
  const description = METRIC_DESCRIPTIONS[title];

  return (
    <div className={`p-5 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${isCritical ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start mb-2 gap-2">
        
        {/* TÍTULO CON TOOLTIP EN HOVER */}
        <div className="relative group/tooltip flex items-center gap-1.5 cursor-help">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide group-hover/tooltip:text-[#001F58] transition-colors">
            {title}
          </h3>
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover/tooltip:text-[#001F58] shrink-0" />

          {/* CAJA FLOTANTE DEL TOOLTIP */}
          {description && (
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-56 p-2.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-30 pointer-events-none transition-opacity duration-200 font-normal normal-case">
              {description}
              <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-900" />
            </div>
          )}
        </div>

        {icon && <div className="text-slate-400 w-4 h-4 shrink-0">{icon}</div>}
      </div>

      <div className="flex items-end gap-3 mt-4">
        <span className={`text-2xl font-black ${isCritical ? 'text-red-700' : 'text-[#001F58]'}`}>{value}</span>
        {trend && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md mb-1 ${isNegativeTrend ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}