"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { parseSelectableUserType } from "@/lib/user-types";

// VA-87: guarda el tipo de cuenta elegido después del primer login con Google (una sola vez).
export async function chooseAccountTypeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");

  const userType = parseSelectableUserType(formData.get("userType"));
  if (!userType) redirect("/onboarding/account-type?error=1");

  await prisma.user.update({
    where: { id: user.id },
    data: { userType, userTypeConfirmed: true },
  });
  redirect(`/profile/${user.id}`);
}
