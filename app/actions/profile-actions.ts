"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { validateImage } from "@/lib/upload-validation";
import { revalidatePath, updateTag } from "next/cache";
import { profileCompletenessTag } from "@/lib/cached-data";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { PASSWORD_REGEX } from "@/lib/password-rules";
import { passwordChangeProof } from "@/lib/password-proof";
import { unstable_update } from "@/lib/auth";
import { normalizeProvince } from "@/lib/provinces";
import { parseSelectableUserType } from "@/lib/user-types";
import { hasCustomPage } from "@/lib/subscriptions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usar service_role para permisos de escritura
);

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const dataToUpdate: Record<string, string | null | boolean> = {};

  const fields = ["name", "phone", "city", "province", "facebook", "instagram"];
  fields.forEach((field) => {
    if (formData.has(field)) {
      const value = (formData.get(field) as string).trim();
      dataToUpdate[field] = value === "" ? null : value;
    }
  });

  // VA-87: tipo de cuenta, solo uno de los que se pueden elegir.
  if (formData.has("userType")) {
    const userType = parseSelectableUserType(formData.get("userType"));
    if (!userType) throw new Error("Elegí un tipo de cuenta de la lista.");
    dataToUpdate.userType = userType;
    dataToUpdate.userTypeConfirmed = true;
  }

  // VA-87: datos de la página personalizada, solo con el beneficio del plan.
  const storefrontFields = ["businessName", "bio", "website", "whatsapp"].filter((f) => formData.has(f));
  if (storefrontFields.length > 0) {
    if (!(await hasCustomPage(user.id))) throw new Error("Tu plan no incluye página personalizada.");
    for (const field of storefrontFields) {
      const value = String(formData.get(field) ?? "").trim();
      dataToUpdate[field] = value === "" ? null : value.slice(0, field === "bio" ? 1500 : 200);
    }
    const website = dataToUpdate.website;
    if (typeof website === "string") {
      const withProtocol = /^https?:\/\//i.test(website) ? website : `https://${website}`;
      try {
        dataToUpdate.website = new URL(withProtocol).toString();
      } catch {
        throw new Error("La web no es una dirección válida.");
      }
    }
    const whatsapp = dataToUpdate.whatsapp;
    if (typeof whatsapp === "string") {
      const digits = whatsapp.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) throw new Error("El WhatsApp tiene que tener entre 8 y 15 números.");
      dataToUpdate.whatsapp = digits;
    }
  }

  // VA-77: la provincia del perfil también es una de las 24 canónicas.
  if (typeof dataToUpdate.province === "string") {
    const canonical = normalizeProvince(dataToUpdate.province);
    if (!canonical) throw new Error("Elegí una provincia de la lista.");
    dataToUpdate.province = canonical;
  }

  if (Object.keys(dataToUpdate).length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
    });
  }

  revalidatePath(`/profile/${user.id}`);
  // Punto rojo del header por perfil incompleto (VA-46).
  updateTag(profileCompletenessTag(user.id));
  return { success: true };
}

export async function updateAvatarAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) throw new Error("NO_FILE");

  const validation = await validateImage(file);
  if (!validation.ok) throw new Error(validation.error);

  const filePath = `${user.id}/avatar.${validation.file.ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Subir imagen al bucket de avatars
  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, buffer, {
      contentType: validation.file.contentType,
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


interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function changePasswordAction({ currentPassword, newPassword }: ChangePasswordInput) {
  try {
    // 1. Obtener usuario autenticado usando tu helper existente
    const userSession = await getCurrentUser();

    if (!userSession?.id) {
      return { error: "No estás autenticado." };
    }

    // 2. Buscar al usuario en la BD mediante prisma
    const user = await prisma.user.findUnique({
      where: { id: userSession.id },
    });

    if (!user || !user.passwordHash) {
      return { error: "Usuario no encontrado o autenticado por proveedor externo (Google/Facebook)." };
    }

    // 3. Verificar la contraseña actual
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isCurrentPasswordCorrect) {
      return { error: "La contraseña actual es incorrecta." };
    }

    // 4. Validar la complejidad de la nueva contraseña con el regex
    if (!PASSWORD_REGEX.test(newPassword)) {
      return { error: "La nueva contraseña no cumple con los requisitos de seguridad." };
    }

    // 5. Validar que la contraseña nueva no sea igual a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return { error: "La nueva contraseña no puede ser igual a la clave actual." };
    }

    // 6. Hashear la nueva contraseña y actualizar mediante prisma
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // VA-105 · 3: passwordChangedAt cierra las otras sesiones (en ≤ 5 minutos, ver lib/auth.ts).
    const changedAt = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordChangedAt: changedAt,
      },
    });

    // Esta sesión sigue: se renueva acá mismo con la prueba firmada (callback jwt, trigger "update").
    await unstable_update({ passwordChangeProof: passwordChangeProof(user.id, changedAt) } as never);

    return { success: true };
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error);
    return { error: "Ocurrió un error inesperado en el servidor." };
  }
}
// VA-87: portada y logo de la página personalizada. Llegan ya comprimidas desde el navegador
// (límite de 4,5 MB de Vercel) y se validan igual que el avatar.
export async function uploadStorefrontImageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!(await hasCustomPage(user.id))) throw new Error("Tu plan no incluye página personalizada.");

  const kind = formData.get("kind");
  if (kind !== "cover" && kind !== "logo") throw new Error("Imagen inválida.");
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) throw new Error("NO_FILE");

  const validation = await validateImage(file);
  if (!validation.ok) throw new Error(validation.error);

  const filePath = `${user.id}/${kind}.${validation.file.ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, buffer, { contentType: validation.file.contentType, upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  await prisma.user.update({ where: { id: user.id }, data: kind === "cover" ? { coverUrl: url } : { logoUrl: url } });

  revalidatePath(`/profile/${user.id}`);
  return { success: true, url };
}
