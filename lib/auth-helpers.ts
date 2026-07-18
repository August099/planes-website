import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireCompleteProfile() {
  const user = await requireUser();
  // `sellerType` may not exist on the User type from auth; use a safe access
  const sellerType = (user as any).sellerType;
  if (!sellerType) redirect("/completar-perfil");
  return user;
}