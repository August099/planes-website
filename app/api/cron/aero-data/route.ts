import { NextRequest, NextResponse } from "next/server";
import { flightPlanEnabled } from "@/lib/flight-plan-flag";
import { runAeroCheck } from "@/lib/aero/import";

// VA-191: busca actualizaciones de LAD y del MADHEL. Corre los primeros días del mes (vercel.json): la lectura
// del MADHEL se retoma por tandas. Deja informes para revisar; nunca publica sola. Vercel solo corre los cron en
// producción: en Preview se dispara con el botón de /admin/aero-data.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!flightPlanEnabled()) return NextResponse.json({ skipped: "Sección apagada" });
  const lad = await runAeroCheck("LAD", 10_000);
  const madhel = await runAeroCheck("MADHEL", 40_000);
  return NextResponse.json({
    lad: { status: lad.report.status, added: lad.report.added, changed: lad.report.changed, removed: lad.report.removed },
    madhel: { status: madhel.report.status, remaining: madhel.remaining },
  });
}
