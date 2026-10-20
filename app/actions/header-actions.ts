"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { hasUnansweredQuestions } from "@/lib/cached-data";
import { getRepublishStatus, hasRepublishAvailable, republishKey } from "@/lib/republish";

export type HeaderIndicators = { isAdmin: boolean; hasUnanswered: boolean; republishKey: string | null };

// Puntos rojos y link de admin del header (VA-71). El header ya no lee la sesión en el servidor
// (eso hacía dinámicas todas las páginas): la parte del usuario los pide desde el navegador.
// VA-167: republishKey (si hay republicaciones disponibles) prende el punto de "Mi Cuenta"; el navegador
// lo apaga si el usuario cerró el cartel con ese mismo saldo.
export async function getHeaderIndicators(): Promise<HeaderIndicators | null> {
  const user = await getCurrentUser();
  if (!user?.id) return null;
  // VA-87: el menú ya no avisa "Completá tu perfil" (eso se ve en "Mi perfil"); solo consultas.
  const [hasUnanswered, republish] = await Promise.all([hasUnansweredQuestions(user.id), getRepublishStatus(user.id)]);
  return { isAdmin: !!user.isAdmin, hasUnanswered, republishKey: hasRepublishAvailable(republish) ? republishKey(republish) : null };
}
