import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { GUIDES, GUIDES_PATH, GUIDE_DISCLAIMER, formatGuideDate, getGuide, guidePath, type GuideLink } from "@/lib/guides";
import { GuideIndex } from "@/components/ui/guides/GuideIndex";
import { PageBackground } from "@/components/ui/PageBackground";
import { JsonLd } from "@/components/seo/JsonLd";
import { guideJsonLd } from "@/lib/structured-data";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Props {
  params: Promise<{ slug: string }>;
}

// Una guía (VA-78). Se generan las 4 en el build; cualquier otro slug da 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
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

const isExternal = (href: string) => /^https?:\/\//.test(href);

function InlineLink({ link }: { link: GuideLink }) {
  const className = "inline-flex items-center gap-1 font-semibold text-[#E70F1F] hover:underline";
  return isExternal(link.href) ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {link.label}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {link.label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  const updated = formatGuideDate(guide.updatedAt);

  return (
    <main className="relative isolate min-h-screen">
      <JsonLd data={guideJsonLd(guide)} />
      <PageBackground page="guides" />

      <div className="container mx-auto px-4 pt-10 pb-20 sm:pt-14">
        <article className="mx-auto max-w-3xl rounded-lg border border-[#001F58]/10 bg-white p-5 sm:p-10">
          <Breadcrumbs
            items={[{ label: "Servicios", href: "/services" }, { label: "Guías", href: GUIDES_PATH }, { label: guide.title }]}
            jsonLd={false}
            className="mb-5"
          />

          <h1 className="font-heading text-2xl font-bold leading-tight text-[#001F58] sm:text-4xl">{guide.title}</h1>
          <p className="mt-3 text-sm text-slate-500">
            {guide.readingMinutes} min de lectura · Actualizada el {updated}
          </p>

          {guide.source && (
            <p className="mt-5 rounded-md border-l-4 border-[#001F58] bg-[#001F58]/5 p-4 text-sm text-slate-700">
              Fuente oficial: <InlineLink link={guide.source} />
            </p>
          )}

          {guide.isGlossary ? (
            <dl className="mt-8 divide-y divide-slate-100">
              {guide.sections.map((s) => (
                <div key={s.id} id={s.id} className="scroll-mt-28 py-4">
                  <dt className="font-heading text-base font-bold text-[#001F58]">{s.heading}</dt>
                  {(s.paragraphs ?? []).map((p, i) => (
                    <dd key={i} className="mt-1 text-[15px] leading-relaxed text-slate-700">
                      {p}
                    </dd>
                  ))}
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-8 space-y-8">
              {guide.sections.map((s) => (
                <section key={s.heading} id={s.id} className="scroll-mt-28">
                  <h2 className="font-heading text-xl font-bold text-[#001F58]">{s.heading}</h2>
                  {(s.paragraphs ?? []).map((p, i) => (
                    <p key={i} className="mt-3 text-[15px] leading-7 text-slate-700">
                      {p}
                    </p>
                  ))}
                  {s.bullets && (
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-slate-700 marker:text-[#E70F1F]">
                      {s.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {s.links && (
                    <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      {s.links.map((l) => (
                        <InlineLink key={l.href} link={l} />
                      ))}
                    </p>
                  )}
                </section>
              ))}
            </div>
          )}

          {guide.cta && (
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {guide.cta.map((c, i) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className={
                    i === 0
                      ? "inline-flex min-h-11 items-center justify-center rounded-md bg-[#E70F1F] px-6 text-sm font-bold text-white transition-colors hover:bg-[#c5121b]"
                      : "inline-flex min-h-11 items-center justify-center rounded-md border border-[#001F58]/20 bg-white px-6 text-sm font-bold text-[#001F58] transition-colors hover:bg-slate-50"
                  }
                >
                  {c.label}
                </Link>
              ))}
            </div>
          )}

          <p className="mt-10 border-t border-slate-100 pt-5 text-xs leading-relaxed text-slate-500">
            {GUIDE_DISCLAIMER} Última revisión: {updated}.
          </p>
        </article>

        <section aria-labelledby="otras-guias" className="mx-auto mt-12 max-w-3xl">
          <h2 id="otras-guias" className="font-heading mb-5 text-xl font-bold text-[#001F58]">
            Otras guías
          </h2>
          <GuideIndex guides={others} />
        </section>
      </div>
    </main>
  );
}
