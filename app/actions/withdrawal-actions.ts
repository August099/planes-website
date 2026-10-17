"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { requestWithdrawal, withdrawalPreview, type WithdrawalResult } from "@/lib/payments/withdrawal";
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

// VA-150: lo que se va a retirar, para mostrarlo antes de confirmar.
export async function withdrawalPreviewAction(paymentId: string) {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false as const, error: "Tenés que iniciar sesión." };
  try {
    return await withdrawalPreview(user.id, String(paymentId ?? ""));
  } catch (error) {
    console.error("[arrepentimiento] error al armar el detalle:", error);
    return { ok: false as const, error: "No pudimos armar el detalle. Probá de nuevo." };
  }
}
