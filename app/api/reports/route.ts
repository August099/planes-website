import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { aircraftId, sparePartId, reason, details, reporterEmail } = body;
    
    const user = await getCurrentUser();

    if (!reason) {
      return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        reason,
        details,
        reporterEmail,
        userId: user ? user.id : null, 
        aircraftId: aircraftId || null,
        sparePartId: sparePartId || null,
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Error al crear el reporte:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}