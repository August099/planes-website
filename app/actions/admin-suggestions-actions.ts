"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// VA-122: marcar una sugerencia como leída (o volver a pendiente). Solo admins.
export async function toggleSuggestionHandledAction(id: string, handled: boolean): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return { ok: false };
  await prisma.suggestion.update({ where: { id }, data: { handledAt: handled ? new Date() : null } });
  revalidatePath("/admin/suggestions");
  return { ok: true };
}
