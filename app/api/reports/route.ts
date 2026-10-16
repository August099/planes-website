import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// Mismos motivos que el select de components/ui/ReportContent.tsx
const VALID_REASONS = [
  "Información engañosa o falsa",
  "Posible estafa o fraude",
  "Publicación duplicada",
  "Contenido inapropiado u ofensivo",
  "Otro",
];
const MAX_DETAILS_LENGTH = 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }

    const { aircraftId, sparePartId, reason, details, reporterEmail } = body;

    if (typeof reason !== "string" || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 });
    }

    const detailsText = typeof details === "string" ? details.trim() : "";
    if (detailsText.length > MAX_DETAILS_LENGTH) {
      return NextResponse.json(
        { error: `Los detalles no pueden superar los ${MAX_DETAILS_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    const email = typeof reporterEmail === "string" ? reporterEmail.trim() : "";
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ error: "El email no es válido" }, { status: 400 });
    }

    // Exactamente una publicación, y tiene que existir.
    const hasAircraft = typeof aircraftId === "string" && aircraftId.length > 0;
    const hasSparePart = typeof sparePartId === "string" && sparePartId.length > 0;
    if (hasAircraft === hasSparePart) {
      return NextResponse.json({ error: "Publicación inválida" }, { status: 400 });
    }

    const listing = hasAircraft
      ? await prisma.aircraft.findUnique({ where: { id: aircraftId }, select: { id: true } })
      : await prisma.sparePart.findUnique({ where: { id: sparePartId }, select: { id: true } });
    if (!listing) {
      return NextResponse.json({ error: "La publicación no existe" }, { status: 404 });
    }

    const user = await getCurrentUser();

    await prisma.report.create({
      data: {
        reason,
        details: detailsText || null,
        reporterEmail: email || null,
        userId: user ? user.id : null,
        aircraftId: hasAircraft ? aircraftId : null,
        sparePartId: hasSparePart ? sparePartId : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al crear el reporte:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
