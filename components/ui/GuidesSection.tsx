import Link from "next/link";
import { GUIDES, GUIDES_PATH } from "@/lib/guides";
import { GuideIndex } from "@/components/ui/guides/GuideIndex";
import { SectionTitle } from "@/components/ui/home/SectionTitle";

// "Guías para comprar y vender" en la Home (VA-78). Server component: no suma JS de cliente.
// VA-85: layout asimétrico (intro a la izquierda, índice numerado a la derecha) en vez de 4 tarjetas.
export function GuidesSection() {
  return (
    <section className="w-full py-12 sm:py-16" aria-labelledby="home-guides-title">
      <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] lg:gap-14">
        <div className="lg:pt-5">
          <SectionTitle id="home-guides-title" tone="dark">
            Guías para comprar y vender
          </SectionTitle>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/80">
            Todo lo que conviene saber antes de cerrar una operación
          </p>
          <Link
            href={GUIDES_PATH}
            className="mt-5 inline-flex text-sm font-semibold text-white underline underline-offset-4 decoration-white/40 hover:decoration-white"
          >
            Ver todas las guías →
          </Link>
        </div>
        <GuideIndex guides={GUIDES} tone="dark" />
      </div>
    </section>
  );
}
