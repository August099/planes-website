"use client";

import { useState } from "react";
import {
  AirVent,
  CalendarCheck,
  ChevronDown,
  Coins,
  DollarSign,
  Gauge,
  Handshake,
  Hash,
  KeyRound,
  Landmark,
  Navigation,
  Package,
  Tag,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { Feature, FeatureIcon } from "@/lib/listing-detail";

const ICONS: Record<FeatureIcon, LucideIcon> = {
  trade: Handshake,
  financing: Landmark,
  negotiable: DollarSign,
  rent: KeyRound,
  passengers: Users,
  certified: CalendarCheck,
  ifr: Navigation,
  autopilot: Gauge,
  aircon: AirVent,
  oxygen: Wind,
  condition: Tag,
  stock: Package,
  price: Coins,
  partNumber: Hash,
};

// "Características de la aeronave" / "del repuesto" (VA-57, maqueta 1): ítems con íconos, 2 columnas en desktop y 1
// en celular. Solo muestra ítems con valor o en "Sí". 27/10 (socio): ya no es un desplegable; se ven las primeras
// 2 y "Ver más características" muestra el resto.
const PREVIEW = 2;

export function FeaturesCard({ title, features }: { title: string; features: Feature[] }) {
  const [expanded, setExpanded] = useState(false);
  if (features.length === 0) return null;
  const visible = expanded ? features : features.slice(0, PREVIEW);
  const hidden = features.length - PREVIEW;

  return (
    <section className="va-plate p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-[-0.01em] text-[#00205B]">{title}</h2>

      {/* Rediseño (25/10): ítems en filas con línea fina e ícono en una placa cuadrada. */}
      <ul id="features-list" className="mt-4 grid grid-cols-1 border-t border-[#00205B]/10 md:grid-cols-2 md:gap-x-8">
        {visible.map((feature) => {
          const Icon = ICONS[feature.icon];
          return (
            <li key={feature.label} className="flex items-center gap-3 border-b border-[#00205B]/10 py-2.5 text-sm text-slate-700">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[#00205B]/12 bg-[#F5F5F5]">
                <Icon className="h-4 w-4 text-[#00205B]" />
              </span>
              <span>
                {feature.label}
                {feature.value && (
                  <>
                    : <strong className="font-bold text-[#00205B]">{feature.value}</strong>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="features-list"
          className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#00205B]/20 px-4 text-xs font-bold text-[#00205B] transition-colors hover:border-[#00205B] hover:bg-[#00205B] hover:text-white cursor-pointer"
        >
          {expanded ? "Ver menos características" : `Ver más características (${hidden})`}
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} aria-hidden />
        </button>
      )}
    </section>
  );
}
