import Link from "next/link";
import { HelpCircle } from "lucide-react";

type DetailRowProps = {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  multiline?: boolean;
  last?: boolean;
  // Link de ayuda junto a la etiqueta (por ejemplo, al glosario de /guias).
  helpHref?: string;
};

export function DetailRow({ label, value, highlight, multiline, last, helpHref }: DetailRowProps) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div
      className={`flex flex-col sm:flex-row ${!last ? "border-b border-gray-200" : ""}`}
    >
      <div className="sm:w-1/3 bg-gray-50 px-4 py-3 font-medium text-gray-600 text-sm">
        {label}
        {helpHref && (
          <Link
            href={helpHref}
            aria-label={`Qué significa ${label}`}
            title={`Qué significa ${label}`}
            className="ml-1.5 inline-flex align-middle text-slate-400 hover:text-[#E70F1F]"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div
        className={`sm:w-2/3 px-4 py-3 text-base ${
          highlight ? "text-blue-600 font-medium hover:underline cursor-pointer" : "text-gray-800"
        } ${multiline ? "whitespace-pre-line leading-relaxed" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}