"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";

// VA-105 · 3: formularios de /forgot-password y /reset-password (sin JavaScript en el cliente: el
// resultado vuelve como parámetro de la URL).

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) redirect("/forgot-password?error=email");
  // Vercel pone la IP real primera en x-forwarded-for.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  let result: Awaited<ReturnType<typeof requestPasswordReset>>;
  try {
    result = await requestPasswordReset(email, ip);
  } catch (error) {
    console.error("[password-reset] no se pudo mandar el mail:", error);
    redirect("/forgot-password?error=server");
  }
  redirect(result === "rate-limited" ? "/forgot-password?error=rate" : "/forgot-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const back = (error: string) => `/reset-password?token=${encodeURIComponent(token)}&error=${error}`;
  if (password !== String(formData.get("confirm") ?? "")) redirect(back("mismatch"));
  const result = await resetPassword(token, password);
  if (result === "weak") redirect(back("weak"));
  if (result === "invalid") redirect("/reset-password?error=invalid");
  redirect("/login?success=PasswordReset");
}
