import type { Metadata } from "next";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { LegalDocument, LegalIndex } from "@/components/ui/legal/LegalDocument";
import { privacySections } from "@/lib/privacy-content";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Ventas Aeronáuticas recopila, usa y protege los datos personales de sus usuarios.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacidadPage() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      <PageBackground page="legal" />

      <div className="container mx-auto px-4 pt-6 pb-20 max-w-6xl">
        <Breadcrumbs items={[{ label: "Privacidad" }]} className="mb-6" />
        <PageHeader variant="plain" routeId="va-route-privacy" className="mb-10" title="Política de privacidad" eyebrow="Última actualización: Noviembre 2026" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          <LegalIndex sections={privacySections} />

          <section className="md:col-span-3">
            <div className="flex max-w-3xl flex-col gap-8 font-sans text-sm leading-relaxed text-[#00205B]/80">
              <LegalDocument sections={privacySections} />

              {/* Leyendas de la autoridad de control (Ley 25.326) */}
              <div className="bg-[#00205B]/5 border-l-2 border-[#00205B] p-5 mt-4 rounded-r-md italic text-xs text-[#00205B]/90 space-y-3">
                <p>
                  “El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326.”
                </p>
                <p className="mb-0">
                  “La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.”
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
