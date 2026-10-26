import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AUDIENCE_LABELS, guidePath } from "@/lib/guides";
import { GuideStatusButton } from "@/components/admin/GuideStatusButton";
import { GuideDuplicateButton } from "@/components/admin/GuideDuplicateButton";

export const dynamic = "force-dynamic";

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

// VA-85: guías de /services/guides. Las nuevas nacen en borrador; se publican desde acá o desde el
// editor, después de la vista previa.
export default async function AdminGuidesPage() {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");

  const guides = await prisma.guide.findMany({
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { id: true, slug: true, title: true, audience: true, status: true, order: true, updatedAt: true, reviewedBy: true },
  });
  const published = guides.filter((g) => g.status === "PUBLISHED").length;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#001F58]">Guías</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {published} publicadas de {guides.length}. Los borradores no se ven en el sitio. La Home muestra las 4 primeras
            publicadas según el orden.
          </p>
        </div>
        <Link
          href="/admin/guides/new"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#001F58] px-4 text-xs font-bold text-white hover:bg-[#00133A]"
        >
          Nueva guía
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#001F58]/12 bg-white">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="border-b border-[#001F58]/10 text-left">
            <tr className={LABEL}>
              <th className="w-16 px-4 py-3 text-right font-semibold">Orden</th>
              <th className="px-4 py-3 font-semibold">Guía</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Actualizada</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {guides.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Todavía no hay guías.
                </td>
              </tr>
            )}
            {guides.map((g) => (
              <tr key={g.id}>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">{g.order}</td>
                <td className="min-w-[240px] px-4 py-3">
                  <Link href={`/admin/guides/${g.id}`} className="font-semibold text-[#001F58] hover:underline">
                    {g.title}
                  </Link>
                  <p className="text-[11px] text-slate-500">
                    {AUDIENCE_LABELS[g.audience]} · <span className="font-mono">{g.slug}</span>
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      g.status === "PUBLISHED" ? "bg-[#001F58] text-white" : "border border-slate-300 text-slate-600"
                    }`}
                  >
                    {g.status === "PUBLISHED" ? "Publicada" : "Borrador"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">
                  {DATE.format(g.updatedAt)}
                  {g.reviewedBy && <span className="block text-[11px] text-slate-500">Revisó: {g.reviewedBy}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <Link href={`/admin/guides/${g.id}`} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#001F58] hover:bg-slate-100">
                      Editar
                    </Link>
                    <Link href={`/admin/guides/${g.id}/preview`} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#001F58] hover:bg-slate-100">
                      Vista previa
                    </Link>
                    {g.status === "PUBLISHED" && (
                      <Link href={guidePath(g.slug)} target="_blank" className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                        Ver
                      </Link>
                    )}
                    <GuideDuplicateButton id={g.id} />
                    <GuideStatusButton id={g.id} title={g.title} status={g.status} compact />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
