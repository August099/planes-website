import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";
import { balanceSchema } from "@/lib/aero/plan-schema";
import type { AircraftBalance } from "@/lib/aero/fpl";

// VA-191: aeronaves de la cuenta para la calculadora de peso y balance, que es una página estática.
export const dynamic = "force-dynamic";

export type ProfileBalanceSummary = { id: string; name: string; balance: AircraftBalance | null };

export async function GET() {
  if (!flightPlanEnabled()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const profiles = await prisma.aircraftProfile.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true, data: true } });
  const body: ProfileBalanceSummary[] = profiles.map((p) => {
    const parsed = balanceSchema.safeParse((p.data as { balance?: unknown } | null)?.balance);
    return { id: p.id, name: p.name, balance: parsed.success ? parsed.data : null };
  });
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
