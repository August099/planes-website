import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aircraftId = searchParams.get("aircraftId");
  const sparePartId = searchParams.get("sparePartId");

  try {
    if (aircraftId) {
      const aircraft = await prisma.aircraft.findUnique({
        where: { id: aircraftId },
        select: { title: true },
      });

      if (aircraft && aircraft.title) {
        return NextResponse.json({ title: aircraft.title });
      }
    }

    if (sparePartId) {
      const sparePart = await prisma.sparePart.findUnique({
        where: { id: sparePartId },
        select: { title: true },
      });

      if (sparePart && sparePart.title) {
        return NextResponse.json({ title: sparePart.title });
      }
    }

    return NextResponse.json({ title: null }, { status: 404 });
  } catch (error) {
    console.error("Error al buscar el título:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}