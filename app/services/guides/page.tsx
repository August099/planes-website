import type { Metadata } from "next";
import { GUIDES_PATH, formatGuideDate } from "@/lib/guides";
import { getPublishedGuides } from "@/lib/guides-data";
import { GuideIndex } from "@/components/ui/guides/GuideIndex";
import { PageBackground } from "@/components/ui/PageBackground";
import { JsonLd } from "@/components/seo/JsonLd";
import { guidesIndexJsonLd } from "@/lib/structured-data";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";

// Índice de guías (VA-78), dentro de Servicios. VA-85: lee las guías publicadas de la base (en
// caché con el tag "guides"); sigue siendo estática y se regenera cuando el admin guarda.
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

export default async function GuidesIndexPage() {
  const guides = await getPublishedGuides();
  const lastReview = guides.map((g) => g.updatedAt).sort().at(-1);
  return (
    <main className="relative isolate min-h-screen">
      <JsonLd data={guidesIndexJsonLd()} />
      <PageBackground page="guides" />

      <div className="container mx-auto max-w-6xl px-4 pt-12 pb-20 sm:pt-16">
        <Breadcrumbs items={[{ label: "Servicios", href: "/services" }, { label: "Guías" }]} jsonLd={false} className="mb-6" />

        {/* Rediseño (26/10): banner de página arriba y el índice numerado en una placa debajo. */}
        <PageHeader
          routeId="va-route-guides-index"
          className="mb-8"
          eyebrow={<span className="tabular-nums">{guides.length} guías{lastReview ? ` · Última revisión el ${formatGuideDate(lastReview)}` : ""}</span>}
          title="Guías para comprar y vender aeronaves"
          subtitle="Todo lo que conviene saber antes de cerrar una operación."
        />
        <div className="va-plate px-5 sm:px-8">
          <GuideIndex guides={guides} headingLevel="h2" />
        </div>
      </div>
    </main>
  );
}
