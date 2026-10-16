"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { parseSelectableUserType } from "@/lib/user-types";

// VA-87: guarda el tipo de cuenta elegido después del primer login con Google (una sola vez).
export async function chooseAccountTypeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  // Solo un destino fijo (no una URL libre), así no sirve para redirigir a otro sitio (VA-33).
  const fromPublish = formData.get("from") === "publish";
  const userType = parseSelectableUserType(formData.get("userType"));
  if (!userType) redirect(`/onboarding/account-type?error=1${fromPublish ? "&from=publish" : ""}`);

  await prisma.user.update({
    where: { id: user.id },
    data: { userType, userTypeConfirmed: true },
  });
  redirect(fromPublish ? "/publish" : `/profile/${user.id}`);
}
