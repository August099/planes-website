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
    <section className="border border-slate-200 rounded-lg bg-slate-50 p-5 sm:p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-3 text-left cursor-pointer"
      >
        <h2 className="text-lg font-bold text-[#001F58]">{title}</h2>
        <ChevronDown className={`w-5 h-5 text-[#001F58] transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      {open && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-5">
          {features.map((feature) => {
            const Icon = ICONS[feature.icon];
            return (
              <li key={feature.label} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="w-9 h-9 shrink-0 rounded-full bg-slate-200/70 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#001F58]" />
                </span>
                <span>
                  {feature.label}
                  {feature.value && (
                    <>
                      : <strong className="font-bold text-slate-900">{feature.value}</strong>
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
