"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { requestWithdrawal, type WithdrawalResult } from "@/lib/payments/withdrawal";
import { PaymentsConfigError } from "@/lib/mercadopago";

// VA-125: "Arrepentirme" en Mis compras.
export async function requestWithdrawalAction(paymentId: string): Promise<WithdrawalResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  try {
    const res = await requestWithdrawal(user.id, String(paymentId ?? ""));
    if (res.ok) revalidatePath(`/profile/${user.id}`);
    return res;
  } catch (error) {
    console.error("[arrepentimiento] error:", error);
    if (error instanceof PaymentsConfigError) return { ok: false, error: "El pago online no está configurado. Escribinos y lo resolvemos." };
    return { ok: false, error: "No pudimos procesar la devolución. Probá de nuevo en unos minutos o escribinos." };
  }
}
