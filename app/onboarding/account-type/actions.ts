"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { notifyBusinessSignup } from "@/lib/business-signup-notice";
import { parseSelectableUserType } from "@/lib/user-types";

// VA-87: guarda el tipo de cuenta elegido después del primer login con Google (una sola vez).
export async function chooseAccountTypeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  // Solo un destino fijo (no una URL libre), así no sirve para redirigir a otro sitio (VA-33).
  const fromPublish = formData.get("from") === "publish";
  const userType = parseSelectableUserType(formData.get("userType"));
  if (!userType) redirect(`/onboarding/account-type?error=1${fromPublish ? "&from=publish" : ""}`);

  const before = await prisma.user.findUnique({ where: { id: user.id }, select: { userType: true, userTypeConfirmed: true } });
  await prisma.user.update({
    where: { id: user.id },
    data: { userType, userTypeConfirmed: true },
  });
  // 28/10: aviso a los socios si eligió empresa (la primera vez que elige, o si antes era particular).
  await notifyBusinessSignup(user.id, before?.userTypeConfirmed ? before.userType : "PARTICULAR");
  redirect(fromPublish ? "/publish" : `/profile/${user.id}`);
}
