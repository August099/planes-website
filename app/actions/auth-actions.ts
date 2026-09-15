"use server";

import { signIn } from "@/lib/auth";

export async function loginWithGoogleAction() {
  await signIn("google", { redirectTo: "/" });
}