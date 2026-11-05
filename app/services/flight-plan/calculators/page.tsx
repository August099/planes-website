import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calculadoras", robots: { index: false, follow: false } };

export default function CalculatorsPage() {
  return (
    <section aria-labelledby="calc-status" className="max-w-2xl">
      <h2 id="calc-status" className="font-heading text-lg font-bold text-[#00205B]">
        En preparación
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">Acá van a estar las calculadoras, de uso libre y sin cuenta.</p>
    </section>
  );
}
