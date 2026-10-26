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

// "Características de la aeronave" / "del repuesto" (VA-57, maqueta 1): card plegable con
// íconos, 2 columnas en desktop y 1 en celular. Solo muestra ítems con valor o en "Sí".
export function FeaturesCard({ title, features }: { title: string; features: Feature[] }) {
  const [open, setOpen] = useState(true);
  if (features.length === 0) return null;

  return (
    <section className="va-plate p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
      >
        <h2 className="text-lg font-extrabold tracking-[-0.01em] text-[#00205B]">{title}</h2>
        <ChevronDown className={`h-5 w-5 text-[#00205B] transition-transform duration-300 ${open ? "" : "-rotate-90"}`} />
      </button>

      {/* Rediseño (25/10): ítems en filas con línea fina e ícono en una placa cuadrada. */}
      {open && (
        <ul className="mt-4 grid grid-cols-1 border-t border-[#00205B]/10 md:grid-cols-2 md:gap-x-8">
          {features.map((feature) => {
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
      )}
    </section>
  );
}
