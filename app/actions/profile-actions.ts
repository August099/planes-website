"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usar service_role para permisos de escritura
);

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const dataToUpdate: Record<string, any> = {};

  const fields = ["name", "phone", "city", "province", "facebook", "instagram"];
  fields.forEach((field) => {
    if (formData.has(field)) {
      const value = (formData.get(field) as string).trim();
      dataToUpdate[field] = value === "" ? null : value;
    }
  });

  if (Object.keys(dataToUpdate).length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
    });
  }

  revalidatePath(`/profile/${user.id}`);
  return { success: true };
}

export async function updateAvatarAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) throw new Error("NO_FILE");

  const fileExt = file.name.split(".").pop();
  const filePath = `${user.id}/avatar.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Subir imagen al bucket de avartars (siempre creá los buckets públicos aug)
  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  // Obtener la URL pública con timestamp para evitar cache
  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const imageUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  await prisma.user.update({
    where: { id: user.id },
    data: { image: imageUrl },
  });

  revalidatePath(`/profile/${user.id}`);
  return { success: true, imageUrl };
}

export async function removeAvatarAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  await prisma.user.update({
    where: { id: user.id },
    data: { image: null },
  });

  revalidatePath(`/profile/${user.id}`);
  return { success: true };
}