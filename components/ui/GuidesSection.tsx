import Link from "next/link";
import { GUIDES_PATH } from "@/lib/guides";
import { getPublishedGuides } from "@/lib/guides-data";
import { SectionTitle } from "@/components/ui/home/SectionTitle";

// "Guías para comprar y vender" en la Home (VA-78). Server component: no suma JS de cliente.
// VA-143 (pedido del socio, 17/10): solo el título y el enlace a /guides, sin el índice de guías.
// Se muestra solo si hay al menos una guía publicada.
export async function GuidesSection() {
  const guides = await getPublishedGuides();
  if (guides.length === 0) return null;
  return (
    <section className="w-full py-12 sm:py-16" aria-labelledby="home-guides-title">
      <div className="container mx-auto px-4 text-center">
        <SectionTitle id="home-guides-title" tone="dark">
          Guías para comprar y vender
        </SectionTitle>
        <Link
          href={GUIDES_PATH}
          className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4 decoration-white/40 hover:decoration-white"
        >
          Ver todas las guías →
        </Link>
      </div>
    </section>
  );
}
