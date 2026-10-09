import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { GuideCard } from "@/components/ui/guides/GuideCard";

// "Guías para comprar y vender" en la Home (VA-78). Server component: no suma JS de cliente.
export function GuidesSection() {
  return (
    <section className="w-full bg-[#FAF5F5] py-12 sm:py-16" aria-labelledby="home-guides-title">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="home-guides-title" className="text-2xl font-bold tracking-tight text-[#001F58] sm:text-3xl">
              Guías para comprar y vender
            </h2>
            <p className="mt-1 text-sm text-slate-500">Todo lo que conviene saber antes de cerrar una operación</p>
          </div>
          <Link href="/guias" className="text-sm font-semibold text-[#E70F1F] hover:underline">
            Ver todas las guías →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDES.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </div>
    </section>
  );
}
