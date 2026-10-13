"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setGuideStatusAction } from "@/app/actions/admin-guides-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// VA-85: publicar / despublicar una guía (con confirmación). Publicar la hace visible en el sitio,
// el sitemap y el menú de Servicios; despublicar la vuelve a borrador (404 al público).
export function GuideStatusButton({ id, title, status, compact = false }: { id: string; title: string; status: "DRAFT" | "PUBLISHED"; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const publishing = status === "DRAFT";

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await setGuideStatusAction(id, publishing ? "PUBLISHED" : "DRAFT");
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? `rounded-md px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${publishing ? "text-[#C20D1A] hover:bg-red-50" : "text-slate-600 hover:bg-slate-100"}`
            : `inline-flex min-h-10 items-center rounded-md px-4 text-xs font-bold cursor-pointer ${publishing ? "bg-[#E70F1F] text-white hover:bg-[#C20D1A]" : "border border-[#001F58]/20 text-[#001F58] hover:bg-slate-50"}`
        }
      >
        {publishing ? "Publicar" : "Despublicar"}
      </button>
      <ConfirmDialog
        open={open}
        eyebrow={publishing ? "Publicar guía" : "Despublicar guía"}
        title={title}
        confirmLabel={publishing ? "Publicar" : "Despublicar"}
        danger={publishing}
        pending={pending}
        error={error}
        onConfirm={run}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
      >
        <p className="text-sm text-slate-600">
          {publishing
            ? "Queda visible en /services/guides, en el sitemap y en el menú de Servicios (y en la Home si está entre las 4 primeras). Revisá la vista previa antes."
            : "Vuelve a borrador: deja de verse en el sitio y su página da 404 hasta que la publiques de nuevo."}
        </p>
      </ConfirmDialog>
    </>
  );
}
