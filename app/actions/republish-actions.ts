"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { republishAll, republishListing, type ListingKind } from "@/lib/republish";

type Result = { ok: true; republished: number } | { ok: false; error: string };

// VA-167: republicar desde el perfil o el detalle propio. Las reglas (saldo, 7 días por aviso, "Republicar
// todas" cada 30 días) están en lib/republish.ts.
function refresh(userId: string) {
  revalidatePath("/"); // "Últimas publicaciones" (la Home es estática)
  revalidatePath("/aircraft");
  revalidatePath("/spareparts");
  revalidatePath(`/profile/${userId}`);
}

export async function republishListingAction(kind: ListingKind, id: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  const res = await republishListing(user.id, kind, id);
  if (res.ok) refresh(user.id);
  return res;
}

export async function republishAllAction(): Promise<Result> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, error: "Tenés que iniciar sesión." };
  const res = await republishAll(user.id);
  if (res.ok) refresh(user.id);
  return res;
}
