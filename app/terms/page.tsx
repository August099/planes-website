// app/terms/page.tsx
import type { Metadata } from "next";
import { TermsContent, termsSections } from "@/lib/terms-content";
import { LegalIndex } from "@/components/ui/legal/LegalDocument";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";

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
        <Breadcrumbs items={[{ label: "Términos y condiciones" }]} className="mb-6" />
        <PageHeader variant="plain" routeId="va-route-terms" className="mb-10" title="Términos y condiciones" eyebrow="Última actualización: Noviembre 2026" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          <LegalIndex sections={termsSections} />

          <section className="md:col-span-3">

            <div className="max-w-3xl font-sans text-sm">
              <TermsContent />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}