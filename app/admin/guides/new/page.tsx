import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { GuideEditor } from "@/components/admin/GuideEditor";
import { EMPTY_GUIDE } from "@/lib/guide-editor-values";

export const dynamic = "force-dynamic";

// VA-85: alta de una guía. Se crea en borrador.
export default async function NewGuidePage() {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#001F58]">Nueva guía</h1>
      <GuideEditor initial={EMPTY_GUIDE} />
    </div>
  );
}
