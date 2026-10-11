import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { GuideEditor } from "@/components/admin/GuideEditor";
import { GuideStatusButton } from "@/components/admin/GuideStatusButton";
import { toEditorValues } from "@/lib/guide-editor-values";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

// VA-85: edición de una guía, con su estado y el botón para publicar o despublicar.
export default async function EditGuidePage({ params }: Props) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  const { id } = await params;
  const row = await prisma.guide.findUnique({ where: { id } });
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <div className="flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {row.status === "PUBLISHED" ? "Publicada" : "Borrador"}
          </p>
          <h1 className="text-2xl font-bold text-[#001F58]">{row.title}</h1>
        </div>
        <GuideStatusButton id={row.id} title={row.title} status={row.status} />
      </div>
      <GuideEditor guideId={row.id} initial={toEditorValues(row)} />
    </div>
  );
}
