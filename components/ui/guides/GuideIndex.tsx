import Link from "next/link";
import { AUDIENCE_LABELS, guidePath, type Guide } from "@/lib/guides";

// Índice de guías (VA-85): filas numeradas separadas por líneas finas, como el índice de un manual,
// en vez de una grilla de tarjetas con ícono. Se usa en la Home (tono oscuro), en /services,
// en /services/guides y en "Otras guías". Server component, sin JS de cliente.
const TONES = {
  light: {
    list: "border-[#001F58]/12",
    row: "border-[#001F58]/12",
    number: "text-[#C20D1A]",
    title: "text-[#001F58]",
    text: "text-slate-600",
    meta: "text-slate-500",
    arrow: "text-[#001F58]/40 group-hover:text-[#C20D1A]",
  },
  dark: {
    list: "border-white/15",
    row: "border-white/15",
    number: "text-[#FFC2C7]",
    title: "text-white",
    text: "text-white/75",
    meta: "text-white/70",
    arrow: "text-white/40 group-hover:text-white",
  },
};

export function GuideIndex({
  guides,
  tone = "light",
  columns = 1,
  numberFrom = 1,
  headingLevel = "h3",
}: {
  guides: Guide[];
  tone?: "light" | "dark";
  columns?: 1 | 2;
  numberFrom?: number;
  headingLevel?: "h2" | "h3";
}) {
  const t = TONES[tone];
  const Heading = headingLevel;
  return (
    <ol className={`grid border-t ${t.list} ${columns === 2 ? "lg:grid-cols-2 lg:gap-x-10" : ""}`}>
      {guides.map((guide, i) => (
        <li key={guide.slug} className={`border-b ${t.row}`}>
          <Link href={guidePath(guide.slug)} className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-3 py-4 sm:grid-cols-[3rem_1fr_auto] sm:py-5">
            <span className={`text-xl font-bold tabular-nums sm:text-2xl ${t.number}`}>{String(numberFrom + i).padStart(2, "0")}</span>
            <div className="min-w-0">
              <Heading className={`text-base font-semibold leading-snug group-hover:underline underline-offset-4 ${t.title}`}>{guide.title}</Heading>
              <p className={`mt-1 line-clamp-2 text-sm leading-relaxed ${t.text}`}>{guide.excerpt}</p>
              <p className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] tabular-nums ${t.meta}`}>
                {AUDIENCE_LABELS[guide.audience]} · {guide.readingMinutes} min
              </p>
            </div>
            <span aria-hidden className={`text-lg transition-colors ${t.arrow}`}>
              →
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
