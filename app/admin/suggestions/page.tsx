import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { SuggestionHandledButton } from "@/components/admin/SuggestionHandledButton";

export const dynamic = "force-dynamic";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

// VA-122: sugerencias del formulario de /about (también llegan por mail a SUPPORT_EMAIL).
export default async function AdminSuggestionsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  const showAll = (await searchParams).all === "1";

  const [items, pendingCount] = await Promise.all([
    prisma.suggestion.findMany({ where: showAll ? {} : { handledAt: null }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.suggestion.count({ where: { handledAt: null } }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#001F58]">Sugerencias</h1>
          <p className="text-sm text-slate-600">
            Del formulario de <Link href="/about" className="font-semibold text-[#001F58] hover:underline">Nosotros</Link>.{" "}
            <span className="tabular-nums">{pendingCount}</span> sin leer.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <Link href="/admin/suggestions" className={`rounded-md px-3 py-1.5 ${showAll ? "border border-[#001F58]/20 text-[#001F58]" : "bg-[#001F58] text-white"}`}>
            Sin leer
          </Link>
          <Link href="/admin/suggestions?all=1" className={`rounded-md px-3 py-1.5 ${showAll ? "bg-[#001F58] text-white" : "border border-[#001F58]/20 text-[#001F58]"}`}>
            Todas
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-[#001F58]/12 bg-white px-5 py-10 text-center text-sm text-slate-500">
          {showAll ? "Todavía no llegó ninguna sugerencia." : "No hay sugerencias sin leer."}
        </p>
      ) : (
        <ul className="divide-y divide-[#001F58]/10 rounded-lg border border-[#001F58]/12 bg-white">
          {items.map((s) => (
            <li key={s.id} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={LABEL}>
                  {DATE.format(s.createdAt)} · {[s.name, s.email].filter(Boolean).join(" · ") || "Anónimo"}
                  {s.handledAt && <span className="ml-2 rounded-sm border border-slate-300 px-1.5 py-0.5 text-[10px]">Leída</span>}
                </p>
                <div className="flex gap-2">
                  {s.email && (
                    <a href={`mailto:${s.email}?subject=${encodeURIComponent("Tu sugerencia en Ventas Aeronáuticas")}`} className="rounded-md border border-[#001F58]/20 px-3 py-1.5 text-xs font-semibold text-[#001F58] hover:bg-slate-50">
                      Responder
                    </a>
                  )}
                  <SuggestionHandledButton id={s.id} handled={!!s.handledAt} />
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{s.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
