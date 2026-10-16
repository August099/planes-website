"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { archivePlanAction, deletePlanAction, restorePlanAction } from "@/app/actions/admin-plans-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Acciones de una fila de /admin/plans (VA-80): editar, archivar/restaurar y eliminar.
// Eliminar solo aparece si nadie lo compró ni está suscripto.
export function PlanRowActions({
  id,
  name,
  archived,
  canDelete,
  users,
}: {
  id: string;
  name: string;
  archived: boolean;
  canDelete: boolean;
  users: number;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"archive" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "No se pudo completar.");
        return;
      }
      setDialog(null);
      router.refresh();
    });
  };

  const btn = "rounded-md px-2.5 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50";

  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      {archived ? (
        <button type="button" disabled={pending} onClick={() => run(() => restorePlanAction(id))} className={`${btn} text-[#001F58] hover:bg-slate-100`}>
          Restaurar
        </button>
      ) : (
        <>
          <Link href={`/admin/plans/${id}`} className={`${btn} text-[#001F58] hover:bg-slate-100`}>
            Editar
          </Link>
          <button type="button" onClick={() => setDialog("archive")} className={`${btn} text-slate-600 hover:bg-slate-100`}>
            Archivar
          </button>
        </>
      )}
      {canDelete && (
        <button type="button" onClick={() => setDialog("delete")} className={`${btn} text-red-700 hover:bg-red-50`}>
          Eliminar
        </button>
      )}

      <ConfirmDialog
        open={dialog === "archive"}
        title={`Archivar "${name}"`}
        confirmLabel="Archivar"
        pending={pending}
        error={error}
        onConfirm={() => run(() => archivePlanAction(id))}
        onClose={() => {
          setDialog(null);
          setError(null);
        }}
      >
        <p className="text-sm text-slate-600">
          Sale de /plans y no se puede comprar.{" "}
          {users > 0
            ? `Las ${users} compras o suscripciones que ya tiene siguen igual.`
            : "Se puede restaurar cuando quieras."}
        </p>
      </ConfirmDialog>

      {canDelete && (
      <ConfirmDialog
        open={dialog === "delete"}
        title={`Eliminar "${name}"`}
        confirmLabel="Eliminar"
        requireText="ELIMINAR"
        danger
        pending={pending}
        error={error}
        onConfirm={(typed) => run(() => deletePlanAction(id, typed))}
        onClose={() => {
          setDialog(null);
          setError(null);
        }}
      >
        <p className="text-sm text-slate-600">Se borra para siempre. Nadie lo compró, así que no afecta a ningún usuario.</p>
      </ConfirmDialog>
      )}
    </div>
  );
}
