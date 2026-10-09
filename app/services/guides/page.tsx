import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES, GUIDES_PATH } from "@/lib/guides";
import { GuideCard } from "@/components/ui/guides/GuideCard";
import { PageBackground } from "@/components/ui/PageBackground";
import { JsonLd } from "@/components/seo/JsonLd";
import { guidesIndexJsonLd } from "@/lib/structured-data";

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
        <nav aria-label="Ruta de navegación" className="mb-6 text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-[#001F58] hover:underline">
                Inicio
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href="/services" className="hover:text-[#001F58] hover:underline">
                Servicios
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li aria-current="page" className="font-medium text-[#001F58]">
              Guías
            </li>
          </ol>
        </nav>

        <h1 className="font-heading text-3xl font-semibold text-[#001F58] sm:text-4xl">
          Guías para comprar y vender aeronaves
        </h1>
        <p className="mt-2 mb-10 max-w-2xl border-b border-[#001F58]/20 pb-4 text-sm text-[#001F58]/70">
          Todo lo que conviene saber antes de cerrar una operación.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {GUIDES.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} headingLevel="h2" />
          ))}
        </div>
      </div>
    </main>
  );
}
