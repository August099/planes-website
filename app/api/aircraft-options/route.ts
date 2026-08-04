import { NextResponse } from "next/server";
import { 
  AircraftBrand, 
  AircraftCategory, 
  SparePartCategory, 
  SparePartCondition 
} from "@prisma/client";

export async function GET() {
  try {
    return NextResponse.json({
      aircraftBrands: Object.values(AircraftBrand),
      aircraftCategories: Object.values(AircraftCategory),
      sparePartCategories: Object.values(SparePartCategory),
      sparePartConditions: Object.values(SparePartCondition),
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener opciones" }, { status: 500 });
  }
}