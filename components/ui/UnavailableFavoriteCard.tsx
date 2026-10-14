"use client";

import { useState, useTransition } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { useRouter } from "next/navigation";
import { toggleFavoriteAction } from "@/app/actions/favorite-actions";

// VA-105 · 5.3: favorito vencido, pausado o vendido. Grisado, sin precio ni link al detalle (que ya
// no es público), con "Quitar de favoritos". No se borra solo: lo decide el usuario.
export function UnavailableFavoriteCard({
  id,
  type,
  title,
  imageUrl,
  reason,
}: {
  id: string;
  type: "AIRCRAFT" | "SPARE_PART";
  title: string;
  imageUrl: string;
  reason: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const remove = () =>
    startTransition(async () => {
      try {
        await toggleFavoriteAction(id, type);
        router.refresh();
      } catch {
        setError(true);
      }
    });

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50" aria-label={`${title} (no disponible)`}>
      <div className="relative aspect-[4/3] w-full">
        <AppImage src={imageUrl} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover opacity-50 grayscale" />
        <span className="absolute left-3 top-3 rounded-sm bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white">Ya no está disponible</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-slate-500">{title}</h3>
        <p className="text-xs text-slate-500">{reason}</p>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="mt-auto inline-flex min-h-10 items-center justify-center rounded-md border border-[#001F58]/20 px-4 text-sm font-semibold text-[#001F58] transition-colors hover:border-[#001F58] disabled:opacity-50"
        >
          {pending ? "Quitando…" : "Quitar de favoritos"}
        </button>
        {error && <p className="text-xs text-red-700">No se pudo quitar. Probá de nuevo.</p>}
      </div>
    </article>
  );
}
