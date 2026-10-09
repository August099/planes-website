import Link from "next/link";
import { Clock } from "lucide-react";
import { AUDIENCE_LABELS, type Guide } from "@/lib/guides";

// Tarjeta de una guía (VA-78): Home, /guias y "Otras guías". Toda la tarjeta es el link.
// Server component, sin JS de cliente.
export function GuideCard({ guide, headingLevel = "h3" }: { guide: Guide; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const Icon = guide.icon;
  return (
    <Link
      href={`/guias/${guide.slug}`}
      className="group flex h-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-3 sm:p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#E70F1F] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E70F1F] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#001F58]/5 text-[#E70F1F] sm:h-10 sm:w-10 sm:rounded-xl">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </span>
        <span className="rounded-full bg-[#001F58]/5 px-2.5 py-1 text-[11px] font-semibold text-[#001F58]">
          {AUDIENCE_LABELS[guide.audience]}
        </span>
      </div>
      <Heading className="font-heading text-base font-bold leading-snug text-[#001F58]">{guide.title}</Heading>
      {/* En celular, tarjeta compacta: el resumen se corta en 2 líneas. */}
      <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600 sm:line-clamp-none">{guide.excerpt}</p>
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {guide.readingMinutes} min
      </span>
    </Link>
  );
}
