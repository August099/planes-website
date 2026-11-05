import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CALCULATORS } from "@/lib/aero/calculators";
import { CALCULATORS_PATH } from "@/lib/flight-plan-flag";

export const metadata: Metadata = { title: "Calculadoras", robots: { index: false, follow: false } };

export default function CalculatorsPage() {
  const groups = [...new Set(CALCULATORS.map((c) => c.group))];
  return (
    <div className="max-w-4xl space-y-8">
      <p className="text-sm leading-relaxed text-slate-700">De uso libre y sin cuenta. Los cálculos se hacen en tu dispositivo, y cada uno tiene su enlace para compartirlo con los datos cargados.</p>
      {groups.map((group) => (
        <section key={group} aria-labelledby={`calc-${group}`}>
          <h2 id={`calc-${group}`} className="va-label border-b border-[#00205B]/15 pb-2">
            {group}
          </h2>
          <ul className="grid gap-x-10 md:grid-cols-2">
            {CALCULATORS.filter((c) => c.group === group).map((c) => (
              <li key={c.slug} className="border-b border-[#00205B]/10">
                <Link href={`${CALCULATORS_PATH}/${c.slug}`} className="group flex min-h-16 items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block font-semibold text-[#00205B] group-hover:text-[#D62828]">{c.name}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">{c.description}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#00205B]/50" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
