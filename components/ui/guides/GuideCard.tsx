import Link from "next/link";
import { Clock } from "lucide-react";
import { AUDIENCE_LABELS, type Guide } from "@/lib/guides";

// Tarjeta de una guía (VA-78): Home, /guias y "Otras guías". Toda la tarjeta es el link.
// Server component, sin JS de cliente.
// variant="dark" (VA-79): tarjeta de vidrio para la zona oscura de la Home.
const STYLES = {
  light: {
    card: "border-slate-200 bg-white shadow-sm hover:shadow-md",
    icon: "bg-[#001F58]/5 text-[#E70F1F]",
    badge: "bg-[#001F58]/5 text-[#001F58]",
    title: "text-[#001F58]",
    text: "text-slate-600",
    meta: "text-slate-500",
  },
  dark: {
    card: "border-white/10 bg-white/5 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.5)]",
    icon: "bg-white/10 text-[#FF8A93]",
    badge: "bg-white/10 text-white",
    title: "text-white",
    text: "text-white/80",
    meta: "text-white/75",
  },
};

export function GuideCard({
  guide,
  headingLevel = "h3",
  variant = "light",
}: {
  guide: Guide;
  headingLevel?: "h2" | "h3";
  variant?: "light" | "dark";
}) {
  const Heading = headingLevel;
  const Icon = guide.icon;
  const st = STYLES[variant];
  return (
    <Link
      href={`/guias/${guide.slug}`}
      className={`group flex h-full flex-col gap-2 rounded-2xl border p-4 sm:gap-3 sm:p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#E70F1F] ${st.card} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E70F1F] motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${st.icon}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.badge}`}>
          {AUDIENCE_LABELS[guide.audience]}
        </span>
      </div>
      <Heading className={`font-heading text-base font-bold leading-snug ${st.title}`}>{guide.title}</Heading>
      {/* En celular, tarjeta compacta: el resumen se corta en 2 líneas. */}
      <p className={`line-clamp-2 flex-1 text-sm leading-relaxed sm:line-clamp-none ${st.text}`}>{guide.excerpt}</p>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${st.meta}`}>
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {guide.readingMinutes} min
      </span>
    </Link>
  );
}
