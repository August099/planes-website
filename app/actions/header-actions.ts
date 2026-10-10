"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { hasUnansweredQuestions } from "@/lib/cached-data";

export type HeaderIndicators = { isAdmin: boolean; hasUnanswered: boolean };

// Puntos rojos y link de admin del header (VA-71). El header ya no lee la sesión en el servidor
// (eso hacía dinámicas todas las páginas): la parte del usuario los pide desde el navegador.
export async function getHeaderIndicators(): Promise<HeaderIndicators | null> {
  const user = await getCurrentUser();
  if (!user?.id) return null;
  // VA-87: el menú ya no avisa "Completá tu perfil" (eso se ve en "Mi perfil"); solo consultas.
  const hasUnanswered = await hasUnansweredQuestions(user.id);
  return { isAdmin: !!user.isAdmin, hasUnanswered };
}
