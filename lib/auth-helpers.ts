import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";


export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}


export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCompleteProfile() {
  const user = await requireUser();
  const sellerType = (user as any).sellerType;
  if (!sellerType) redirect("/completar-perfil");
  return user;
}