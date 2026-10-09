import Link from "next/link";
import { GUIDES, GUIDES_PATH } from "@/lib/guides";
import { GuideCard } from "@/components/ui/guides/GuideCard";
import { SectionTitle } from "@/components/ui/home/SectionTitle";

// "Guías para comprar y vender" en la Home (VA-78). Server component: no suma JS de cliente.
export function GuidesSection() {
  return (
    <section className="w-full py-12 sm:py-16" aria-labelledby="home-guides-title">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionTitle id="home-guides-title" tone="dark">
              Guías para comprar y vender
            </SectionTitle>
            <p className="mt-1 text-sm text-white/80">Todo lo que conviene saber antes de cerrar una operación</p>
          </div>
          <Link href={GUIDES_PATH} className="text-sm font-semibold text-white underline-offset-4 hover:underline">
            Ver todas las guías →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDES.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} variant="dark" />
          ))}
        </div>
      </div>
    </section>
  );
}
