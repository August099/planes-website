// app/terms/page.tsx
import type { Metadata } from "next";
import { TermsContent, termsSections } from "@/lib/terms-content";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso de Ventas Aeronáuticas, el marketplace de aviones y repuestos aeronáuticos de Argentina.",
  alternates: { canonical: "/terms" },
};

export default function TerminosPage() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      <PageBackground page="legal" />

      <div className="container mx-auto px-4 pt-6 pb-20 max-w-6xl">
        <Breadcrumbs items={[{ label: "Términos y condiciones" }]} className="mb-8 sm:mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          <aside className="md:col-span-1 flex flex-col gap-2 border-l border-[#001F58]/20 pl-4 md:sticky md:top-24">
            <p className="text-xs font-semibold text-[#001F58]/50 uppercase tracking-wider mb-2">
              Índice
            </p>
            {termsSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm py-1.5 font-medium text-[#001F58]/70 hover:text-[#001F58] transition-colors scroll-smooth"
              >
                {section.title}
              </a>
            ))}
          </aside>

          <section className="md:col-span-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#001F58] mb-2">
              TÉRMINOS Y CONDICIONES DE USO
            </h1>
            <p className="text-sm text-[#001F58]/60 mb-12 border-b border-[#001F58]/20 pb-4">
              <strong>Última actualización:</strong> Julio 2026.
            </p>

            <div className="max-w-3xl font-sans text-sm">
              <TermsContent />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}