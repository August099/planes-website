"use server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { hasUnansweredQuestions } from "@/lib/cached-data";
import { getRepublishStatus, hasRepublishAvailable, republishKey } from "@/lib/republish";
import { missingProfileFields } from "@/lib/account-data";
import { prisma } from "@/lib/prisma";

export type HeaderIndicators = { isAdmin: boolean; hasUnanswered: boolean; republishKey: string | null; missingProfile: boolean };

// Puntos rojos y link de admin del header (VA-71). El header ya no lee la sesión en el servidor
// (eso hacía dinámicas todas las páginas): la parte del usuario los pide desde el navegador.
// VA-167: republishKey (si hay republicaciones disponibles) prende el punto de "Mi Cuenta"; el navegador
// lo apaga si el usuario cerró el cartel con ese mismo saldo.
export async function getHeaderIndicators(): Promise<HeaderIndicators | null> {
  const user = await getCurrentUser();
  if (!user?.id) return null;
  // VA-185: los datos faltantes se avisan con un punto en "Ajustes", que lleva a completarlos.
  // 26/10: republicar solo mueve avisos activos; sin ninguno, el punto quedaba prendido para siempre en las
  // cuentas que republican todo cada 30 días (Broker y admins) aunque no hubiera nada que republicar.
  const [hasUnanswered, republish, missing, activeAircraft, activeParts] = await Promise.all([
    hasUnansweredQuestions(user.id),
    getRepublishStatus(user.id),
    missingProfileFields(user.id),
    prisma.aircraft.count({ where: { sellerId: user.id, status: "ACTIVE" } }),
    prisma.sparePart.count({ where: { sellerId: user.id, status: "ACTIVE" } }),
  ]);
  const canRepublish = activeAircraft + activeParts > 0 && hasRepublishAvailable(republish);
  return { isAdmin: !!user.isAdmin, hasUnanswered, republishKey: canRepublish ? republishKey(republish) : null, missingProfile: missing.length > 0 };
}
