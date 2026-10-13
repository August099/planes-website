"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateGuideAction } from "@/app/actions/admin-guides-actions";

// VA-85: duplica una guía como borrador y abre el editor de la copia.
export function GuideDuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await duplicateGuideAction(id);
          if (res.ok) router.push(`/admin/guides/${res.id}`);
        })
      }
      className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
    >
      {pending ? "Duplicando…" : "Duplicar"}
    </button>
  );
}
