import type { Metadata } from "next";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SuggestionForm } from "./SuggestionForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "Quiénes somos y por qué hicimos Ventas Aeronáuticas, el lugar para comprar y vender aviones y repuestos en Argentina.",
  alternates: { canonical: "/about" },
};

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

// VA-122: página "Nosotros". ⚠️ PLANTILLA: los textos marcados con [COMPLETAR] son de ejemplo y los
// reemplazan los socios con la misión real. Estructura: misión, qué hacemos, cómo trabajamos y el
// formulario de sugerencias.
const PILLARS = [
  {
    code: "01",
    title: "Qué hacemos",
    text: "[COMPLETAR] Reunimos en un solo lugar aviones, helicópteros y repuestos de todo el país, con fichas técnicas completas para comparar con datos.",
  },
  {
    code: "02",
    title: "Para quién",
    text: "[COMPLETAR] Para pilotos, aeroclubes, escuelas, talleres, brokers y fábricas que compran o venden en la aviación general argentina.",
  },
  {
    code: "03",
    title: "Cómo lo hacemos",
    text: "[COMPLETAR] Contacto directo con el vendedor, sin comisiones por venta, y guías para comprar y vender con información clara.",
  },
];

export default function AboutPage() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      <PageBackground page="faq" />
      <div className="container mx-auto max-w-6xl px-4 pt-6 pb-20">
        <Breadcrumbs items={[{ label: "Nosotros" }]} className="mb-6" />
        <PageHeader routeId="va-route-about" className="mb-10" eyebrow="Nosotros" title="Nuestra misión" />

        <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section>
            {/* [COMPLETAR] Misión real de Ventas Aeronáuticas. */}
            <p className="max-w-2xl text-base leading-relaxed text-slate-700">
              [COMPLETAR] Hacer que comprar y vender una aeronave en Argentina sea simple, transparente y seguro, conectando a quienes
              vuelan con la información que necesitan para decidir.
            </p>

            <ol className="mt-10 divide-y divide-[#00205B]/10 rounded-lg border border-[#00205B]/12 bg-white">
              {PILLARS.map((p) => (
                <li key={p.code} className="flex gap-4 px-5 py-4">
                  <span className="w-6 shrink-0 font-semibold tabular-nums text-[#D62828]">{p.code}</span>
                  <div>
                    <h2 className="text-sm font-bold text-[#00205B]">{p.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-sm text-slate-600">
              ¿Tenés una consulta puntual? Mirá las{" "}
              <Link href="/faq" className="font-semibold text-[#00205B] hover:text-[#D62828] hover:underline">
                preguntas frecuentes
              </Link>{" "}
              o escribinos a los datos de contacto del pie de la página.
            </p>
          </section>

          <section aria-labelledby="sugerencias" className="h-fit rounded-lg border border-[#00205B]/12 bg-white p-6">
            <p className={LABEL}>Sugerencias</p>
            <h2 id="sugerencias" className="mt-1 text-lg font-bold text-[#00205B]">
              Ayudanos a mejorar
            </h2>
            <p className="mt-2 mb-5 text-sm text-slate-600">
              Estamos empezando y queremos construir la web con quienes la usan. Contanos qué te sirve, qué falta o qué cambiarías.
            </p>
            <SuggestionForm />
          </section>
        </div>
      </div>
    </main>
  );
}
