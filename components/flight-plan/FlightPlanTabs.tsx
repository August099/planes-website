"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CALCULATORS_PATH, FLIGHT_PLAN_PATH, MAP_PATH } from "@/lib/flight-plan-flag";

const TABS = [
  { href: FLIGHT_PLAN_PATH, label: "Plan de vuelo" },
  { href: MAP_PATH, label: "Mapa" },
  { href: CALCULATORS_PATH, label: "Calculadoras" },
];

export function FlightPlanTabs() {
  const pathname = usePathname() ?? "";
  const current = pathname.startsWith(CALCULATORS_PATH) ? CALCULATORS_PATH : pathname.startsWith(MAP_PATH) ? MAP_PATH : FLIGHT_PLAN_PATH;
  return (
    <nav aria-label="Secciones de Plan de vuelo" className="flex gap-6 border-b border-[#00205B]/15">
      {TABS.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px min-h-11 border-b-2 py-2.5 text-sm font-bold transition-colors ${active ? "border-[#D62828] text-[#00205B]" : "border-transparent text-[#00205B]/65 hover:text-[#00205B]"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
