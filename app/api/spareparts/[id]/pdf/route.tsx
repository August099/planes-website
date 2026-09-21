import { prisma } from "@/lib/prisma";
import { pdf } from "@react-pdf/renderer";
import { SparePartPDF } from "@/components/ui/SparePartPDF";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sparePart = await prisma.sparePart.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" }, take: 1 },
      category: { include: { parent: true } },
    },
  });

  if (!sparePart) {
    return new Response("No encontrado", { status: 404 });
  }

  const seller = await prisma.user.findUnique({ where: { id: sparePart.sellerId } });
  if (!seller) {
    return new Response("Vendedor no encontrado", { status: 404 });
  }

  const priceNumber = sparePart.price ? Number(sparePart.price) : null;
  const numberFormatted =
    priceNumber !== null
      ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(priceNumber)
      : null;
  const formattedPrice = numberFormatted
    ? `${sparePart.inPesos ? "AR$" : "US$"} ${numberFormatted}`
    : "Consultar precio";

  const blob = await pdf(
    <SparePartPDF
      sparePart={{ ...sparePart, attributes: (sparePart.attributes as Record<string, any>) ?? {} }}
      seller={seller}
      formattedPrice={formattedPrice}
    />
  ).toBlob();

  const buffer = Buffer.from(await blob.arrayBuffer());

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="repuesto-${sparePart.id.slice(-6)}.pdf"`,
    },
  });
}