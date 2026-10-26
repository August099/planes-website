import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guidePath } from "@/lib/guides";
import { getPublishedGuide, getPublishedGuides } from "@/lib/guides-data";
import { GuideIndex } from "@/components/ui/guides/GuideIndex";
import { GuideArticle } from "@/components/ui/guides/GuideArticle";
import { PageBackground } from "@/components/ui/PageBackground";
import { JsonLd } from "@/components/seo/JsonLd";
import { guideJsonLd } from "@/lib/structured-data";

interface Props {
  params: Promise<{ slug: string }>;
}

// Una guía (VA-78). VA-85: sale de la base. Las PUBLISHED se generan en el build; una que se
// publica después se genera en el primer pedido y queda en caché (el admin invalida el tag
// "guides"). Las DRAFT y los slugs que no existen dan 404.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedGuides()).map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublishedGuide(slug);
  if (!guide) return {};
  const path = guidePath(guide.slug);
  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: guide.title,
      description: guide.metaDescription,
      url: path,
      type: "article",
      modifiedTime: guide.updatedAt,
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getPublishedGuide(slug);
  if (!guide) notFound();

  const others = (await getPublishedGuides()).filter((g) => g.slug !== guide.slug);

  return (
    <main className="relative isolate min-h-screen">
      <JsonLd data={guideJsonLd(guide)} />
      <PageBackground page="guides" />

      <div className="container mx-auto px-4 pt-10 pb-20 sm:pt-14">
        <GuideArticle guide={guide} />

        {others.length > 0 && (
          <section aria-labelledby="otras-guias" className="mx-auto mt-12 max-w-3xl">
            <h2 id="otras-guias" className="font-heading mb-5 text-xl font-bold text-[#00205B]">
              Otras guías
            </h2>
            <GuideIndex guides={others} />
          </section>
        )}
      </div>
    </main>
  );
}
