import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { GUIDES_PATH, GUIDE_DISCLAIMER, formatGuideDate, type Guide, type GuideLink } from "@/lib/guides";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

// Cuerpo de una guía (VA-78). VA-85: componente aparte para que la página pública y la vista
// previa del admin se vean exactamente igual.

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

export function GuideArticle({ guide, breadcrumbs = true }: { guide: Guide; breadcrumbs?: boolean }) {
  const updated = formatGuideDate(guide.updatedAt);
  return (
    <article className="mx-auto max-w-3xl rounded-lg border border-[#001F58]/10 bg-white p-5 sm:p-10">
      {breadcrumbs && (
        <Breadcrumbs
          items={[{ label: "Servicios", href: "/services" }, { label: "Guías", href: GUIDES_PATH }, { label: guide.title }]}
          jsonLd={false}
          className="mb-5"
        />
      )}

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
          {guide.sections.map((s, si) => (
            <div key={s.id ?? si} id={s.id} className="scroll-mt-28 py-4">
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
          {guide.sections.map((s, si) => (
            <section key={si} id={s.id} className="scroll-mt-28">
              <h2 className="font-heading text-xl font-bold text-[#001F58]">{s.heading}</h2>
              {(s.paragraphs ?? []).map((p, i) => (
                <p key={i} className="mt-3 text-[15px] leading-7 text-slate-700">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-slate-700 marker:text-[#E70F1F]">
                  {s.bullets.map((b, bi) => (
                    <li key={bi}>{b}</li>
                  ))}
                </ul>
              )}
              {s.links && (
                <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {s.links.map((l, li) => (
                    <InlineLink key={li} link={l} />
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
              key={i}
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
  );
}
