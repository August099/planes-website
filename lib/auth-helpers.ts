import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";


export async function getCurrentUser() {
  const session = await auth();
  //console.log(session?.user)
  return session?.user ?? null;
}


export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

