"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserType } from "@prisma/client";
import { issueVerificationEmail } from "@/lib/verification";

export async function registerUserAction(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const userTypeInput = formData.get("userType") as string;
    const termsAccepted = formData.get("termsAccepted") as string;

    // 1. Validar campos requeridos
    if (!name || !email || !password) {
      return { error: "MissingFields" };
    }

    // 2. Validar aceptación de Términos y Condiciones
    if (termsAccepted !== "true") {
      return { error: "TermsRequired" };
    }

    // 3. Validar fortaleza de la contraseña
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return { error: "WeakPassword" };
    }

    // 4. Verificar si el email ya está registrado
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return { error: "EmailExists" };
    }

    // 5. Mapear el valor del formulario al Enum de Prisma (UserType)
    const userType: UserType = userTypeInput === "COMPANY" ? UserType.RESELLER : UserType.PARTICULAR;

    // 6. Enhashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 7. Lógica de Miembro Fundador (Primeros 50 usuarios registrados)
    const totalUsersCount = await prisma.user.count();
    const isFoundingMember = totalUsersCount < 50;

    // 8. Crear el usuario en la base de datos
    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        userType,
        isFoundingMember,
      },
    });

    // 9. Token + mail de verificación (VA-20). Si el mail falla, la cuenta queda creada y
    //    se puede pedir otro desde el login ("Reenviar mail de verificación").
    try {
      await issueVerificationEmail(email);
    } catch (mailError) {
      console.error("Error al enviar el mail de verificación:", mailError);
      return { success: "CheckEmailRetry" };
    }

    return { success: "CheckEmail" };
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return { error: "ServerError" };
  }
}