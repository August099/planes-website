import { prisma } from "@/lib/prisma";
import { pdf } from "@react-pdf/renderer";
import { AircraftPDF } from "@/components/ui/AircraftPDF";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const aircraft = await prisma.aircraft.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" }, take: 3 },
      engines: true,
      propeller: true,
      brand: true,
      model: true,
      subModel: true,
      category: true,
    },
  });

  if (!aircraft) {
    return new Response("No encontrado", { status: 404 });
  }

  const seller = await prisma.user.findUnique({ where: { id: aircraft.sellerId } });
  if (!seller) {
    return new Response("Vendedor no encontrado", { status: 404 });
  }

  const formattedPrice = aircraft.price
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(aircraft.price))
    : "Consultar precio";

  const displayBrand = aircraft.brand?.name || aircraft.customBrand;
  const displayModel = aircraft.model?.name || aircraft.customModel;
  const displaySubModel = aircraft.subModel?.name ?? null;

  const blob = await pdf(
    <AircraftPDF
      aircraft={aircraft}
      seller={seller}
      formattedPrice={formattedPrice}
      displayBrand={displayBrand}
      displayModel={displayModel}
      displaySubModel={displaySubModel}
    />
  ).toBlob();

  const buffer = Buffer.from(await blob.arrayBuffer());

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="avion-${aircraft.id.slice(-6)}.pdf"`,
    },
  });
}