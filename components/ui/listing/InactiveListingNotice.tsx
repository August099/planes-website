import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

// Lo que ve quien no es el dueño cuando la publicación está vencida o pausada (VA-14).
export function InactiveListingNotice({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <main className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
      <div className="p-8 max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-[#001F58]">Publicación pausada o inactiva</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Esta publicación ya no está disponible porque venció su período de publicación o el vendedor la pausó.
        </p>
        <div className="pt-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#001F58] text-white font-semibold text-xs rounded-xl hover:bg-blue-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
