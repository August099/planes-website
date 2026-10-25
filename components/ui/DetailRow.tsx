import Link from "next/link";
import { HelpCircle } from "lucide-react";

type DetailRowProps = {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  multiline?: boolean;
  last?: boolean;
  // Link de ayuda junto a la etiqueta (por ejemplo, al glosario de /services/guides).
  helpHref?: string;
};

export function DetailRow({ label, value, highlight, multiline, last, helpHref }: DetailRowProps) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div
      className={`flex flex-col sm:flex-row ${!last ? "border-b border-[#00205B]/10" : ""}`}
    >
      <div className="sm:w-1/3 bg-[#F5F5F5] px-4 py-3 text-[13px] font-semibold text-slate-600">
        {label}
        {helpHref && (
          <Link
            href={helpHref}
            aria-label={`Qué significa ${label}`}
            title={`Qué significa ${label}`}
            className="ml-1.5 inline-flex align-middle text-slate-400 hover:text-[#D62828]"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div
        className={`sm:w-2/3 px-4 py-3 text-[15px] tabular-nums ${
          highlight ? "text-[#00205B] font-semibold hover:underline cursor-pointer" : "text-[#00205B]"
        } ${multiline ? "whitespace-pre-line leading-relaxed" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}