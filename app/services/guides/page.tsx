import type { Metadata } from "next";
import { GUIDES, GUIDES_PATH, formatGuideDate } from "@/lib/guides";
import { GuideIndex } from "@/components/ui/guides/GuideIndex";
import { PageBackground } from "@/components/ui/PageBackground";
import { JsonLd } from "@/components/seo/JsonLd";
import { guidesIndexJsonLd } from "@/lib/structured-data";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

// Índice de guías (VA-78), dentro de Servicios. Estática: sin base de datos ni cookies.
export const metadata: Metadata = {
  title: "Guías para comprar y vender aeronaves",
  description:
    "Checklist de pre-compra, consejos para vender tu avión, la transferencia ante ANAC y un glosario de términos aeronáuticos.",
  alternates: { canonical: GUIDES_PATH },
  openGraph: {
    title: "Guías para comprar y vender aeronaves",
    description:
      "Checklist de pre-compra, consejos para vender tu avión, la transferencia ante ANAC y un glosario de términos aeronáuticos.",
    url: GUIDES_PATH,
    type: "website",
  },
};

export default function GuidesIndexPage() {
  return (
    <main className="relative isolate min-h-screen">
      <JsonLd data={guidesIndexJsonLd()} />
      <PageBackground page="guides" />

      <div className="container mx-auto max-w-6xl px-4 pt-12 pb-20 sm:pt-16">
        <Breadcrumbs items={[{ label: "Servicios", href: "/services" }, { label: "Guías" }]} jsonLd={false} className="mb-6" />

        {/* VA-85: asimétrico. A la izquierda la presentación, a la derecha el índice numerado. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-14">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-[#001F58] sm:text-4xl">
              Guías para comprar y vender aeronaves
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-700">
              Todo lo que conviene saber antes de cerrar una operación.
            </p>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 tabular-nums">
              {GUIDES.length} guías · Revisadas el {formatGuideDate(GUIDES[0].updatedAt)}
            </p>
          </div>
          <div className="rounded-lg border border-[#001F58]/10 bg-white px-5 sm:px-6">
            <GuideIndex guides={GUIDES} headingLevel="h2" />
          </div>
        </div>
      </div>
    </main>
  );
}
