"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";
import { applyAeroImport, rejectAeroImport, runAeroCheck } from "@/lib/aero/import";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin || !flightPlanEnabled()) return null;
  return user;
}

/** Una tanda de lectura. El admin la repite mientras `remaining` sea mayor que 0. */
export async function checkAeroDataAction(dataset: "MADHEL" | "LAD"): Promise<{ ok: boolean; remaining: number; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, remaining: 0, error: "No autorizado." };
  const { report, remaining } = await runAeroCheck(dataset);
  revalidatePath("/admin/aero-data");
  return report.status === "FAILED" ? { ok: false, remaining: 0, error: report.error ?? "Falló la lectura." } : { ok: true, remaining };
}

export async function applyAeroImportAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };
  try {
    const res = await applyAeroImport(id, admin.id);
    revalidatePath("/admin/aero-data");
    return res;
  } catch (error) {
    console.error("[aero] no se pudo aplicar:", error);
    return { ok: false, error: "No se pudo aplicar. Sigue vigente la versión anterior." };
  }
}

export async function rejectAeroImportAction(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };
  await rejectAeroImport(id);
  revalidatePath("/admin/aero-data");
  return { ok: true };
}
