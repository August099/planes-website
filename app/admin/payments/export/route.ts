import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { paymentsCsv } from "@/lib/admin-payments";

// VA-92: CSV del período para el contador (pagos aprobados con su factura). Solo admin.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const url = new URL(req.url);
  const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const now = new Date();
  const fromStr = day(url.searchParams.get("from")) ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const toStr = day(url.searchParams.get("to")) ?? now.toISOString().slice(0, 10);
  const csv = await paymentsCsv(new Date(`${fromStr}T00:00:00-03:00`), new Date(`${toStr}T23:59:59-03:00`));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pagos_${fromStr}_${toStr}.csv"`,
    },
  });
}
