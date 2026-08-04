import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Cambia según la ubicación real de tu archivo
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        aircraftListingsBalance: true,
        sparePartsListingsBalance: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      aircraftListingsBalance: user.aircraftListingsBalance ?? 0,
      sparePartsListingsBalance: user.sparePartsListingsBalance ?? 0,
    });
  } catch (error) {
    console.error("Error en /api/user/credits:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}