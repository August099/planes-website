"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getAccountPlan } from "@/lib/plan-benefits";
import { sectionsSchema, type PageSection } from "@/lib/profile-page";

type Result = { ok: true } | { ok: false; error: string };

// VA-169: guardar la Página VA armable. "Publicar cambios" la deja a la vista de todos (y descarta el
// borrador); "Guardar borrador" la guarda sin publicar. Solo con la Página VA completa (Broker y admins).
export async function saveProfilePageAction(sections: PageSection[], publish: boolean): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  if ((await getAccountPlan(user.id)).vaPage !== "FULL") return { ok: false, error: "Tu plan no incluye la Página VA completa." };
  const parsed = sectionsSchema.safeParse(sections);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá las secciones." };

  const value = parsed.data as Prisma.InputJsonValue;
  const fields = publish
    ? { sections: value, draftSections: Prisma.DbNull, publishedAt: new Date() }
    : { draftSections: value };
  await prisma.profilePage.upsert({
    where: { userId: user.id },
    create: { userId: user.id, sections: publish ? value : [], ...fields },
    update: fields,
  });
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

/** VA-169: descartar el borrador (vuelve a lo publicado). */
export async function discardProfilePageDraftAction(): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  await prisma.profilePage.updateMany({ where: { userId: user.id }, data: { draftSections: Prisma.DbNull } });
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
