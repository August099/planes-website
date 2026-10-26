import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getGuideForPreview } from "@/lib/guides-data";
import { GuideArticle } from "@/components/ui/guides/GuideArticle";
import { GuideStatusButton } from "@/components/admin/GuideStatusButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ id: string }>;
}

// VA-85: vista previa de una guía (cualquier estado), igual a como se va a ver en el sitio.
export default async function GuidePreviewPage({ params }: Props) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  const { id } = await params;
  const guide = await getGuideForPreview(id);
  if (!guide) notFound();
  const row = await prisma.guide.findUnique({ where: { id }, select: { status: true } });

  return (
    <div className="space-y-6">
      <div className="flex max-w-3xl flex-col gap-3 rounded-lg border-l-2 border-[#E70F1F] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          <span className="font-bold text-[#001F58]">Vista previa</span> ·{" "}
          {row?.status === "PUBLISHED" ? "publicada: así se ve en el sitio." : "borrador: el público todavía no la ve (da 404)."}
        </p>
        <div className="flex items-center gap-2">
          <Link href={`/admin/guides/${id}`} className="rounded-md border border-[#001F58]/20 px-4 py-2 text-xs font-semibold text-[#001F58] hover:bg-slate-50">
            Editar
          </Link>
          {row && <GuideStatusButton id={id} title={guide.title} status={row.status} />}
        </div>
      </div>
      <GuideArticle guide={guide} breadcrumbs={false} />
    </div>
  );
}
