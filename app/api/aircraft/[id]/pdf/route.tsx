import { aircraftPdfResponse } from "@/lib/listing-pdf";

// VA-87 A: PDF de una aeronave con QR (ver lib/listing-pdf.tsx).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return aircraftPdfResponse(id);
}
