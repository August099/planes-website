import "server-only";
import { prisma } from "@/lib/prisma";
import { getAccountPlan } from "@/lib/plan-benefits";
import { accentHex } from "@/lib/accent-colors";

// VA-170: datos para el detalle de un aviso de un Broker (o admin) con "detalles personalizados".
// null = detalle común (Base y Pro).
export type BrokerDetail = {
  name: string;
  logoUrl: string | null;
  /** Portada de los detalles; si no subió, la de la Página VA; si tampoco, la estándar de VA (null). */
  coverUrl: string | null;
  verified: boolean;
  accent: string;
  pageHref: string;
};

export async function getBrokerDetail(sellerId: string): Promise<BrokerDetail | null> {
  const plan = await getAccountPlan(sellerId);
  if (!plan.customDetail) return null;
  const u = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { name: true, businessName: true, logoUrl: true, coverUrl: true, detailCoverUrl: true, accentColor: true },
  });
  if (!u) return null;
  return {
    name: u.businessName || u.name || "Vendedor",
    logoUrl: u.logoUrl,
    coverUrl: u.detailCoverUrl || u.coverUrl || null,
    verified: plan.verified,
    accent: accentHex(u.accentColor),
    pageHref: `/profile/${sellerId}`,
  };
}
